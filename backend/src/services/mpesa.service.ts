import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface STKCallbackData {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

class MpesaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.mpesa.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Get OAuth access token from Safaricom
   */
  async getAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${config.mpesa.consumerKey}:${config.mpesa.consumerSecret}`
    ).toString('base64');

    try {
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      return response.data.access_token;
    } catch (error: any) {
      logger.error('Failed to get M-Pesa access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);

    const password = Buffer.from(
      `${config.mpesa.shortcode}${config.mpesa.passkey}${timestamp}`
    ).toString('base64');

    return { password, timestamp };
  }

  /**
   * Format phone number to 254XXXXXXXXX format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or other characters
    let cleaned = phone.replace(/[^0-9]/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.slice(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }

    return cleaned;
  }

  /**
   * Initiate STK Push (Lipa Na M-Pesa Online)
   */
  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string = 'Payment'
  ): Promise<STKPushResponse> {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    const payload = {
      BusinessShortCode: config.mpesa.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount), // M-Pesa requires whole numbers
      PartyA: formattedPhone,
      PartyB: config.mpesa.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: config.mpesa.callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    try {
      logger.info(`Initiating STK Push for ${formattedPhone}, Amount: ${amount}, Ref: ${accountReference}`);

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('STK Push Response:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('STK Push failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment');
    }
  }

  /**
   * Query STK Push status
   */
  async querySTKStatus(checkoutRequestId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();

    const payload = {
      BusinessShortCode: config.mpesa.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('STK Query failed:', error.response?.data || error.message);
      throw new Error('Failed to query payment status');
    }
  }

  /**
   * Process STK Push callback from Safaricom
   */
  async processCallback(callbackData: STKCallbackData): Promise<void> {
    const { stkCallback } = callbackData.Body;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    logger.info(`M-Pesa Callback received - CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode}`);

    // Find the order by CheckoutRequestID (stored in paymentReference)
    const order = await prisma.order.findFirst({
      where: {
        paymentReference: CheckoutRequestID,
      },
    });

    if (!order) {
      logger.warn(`No order found for CheckoutRequestID: ${CheckoutRequestID}`);
      return;
    }

    if (ResultCode === 0) {
      // Payment successful
      let mpesaReceiptNumber = '';
      let transactionDate = '';
      let phoneNumber = '';

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') {
            mpesaReceiptNumber = String(item.Value);
          } else if (item.Name === 'TransactionDate') {
            transactionDate = String(item.Value);
          } else if (item.Name === 'PhoneNumber') {
            phoneNumber = String(item.Value);
          }
        }
      }

      // Update order to PAID status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentMethod: 'MPESA_STK',
          paymentProofUrl: `M-Pesa Receipt: ${mpesaReceiptNumber}`,
          processingNotes: `STK Push payment received. Receipt: ${mpesaReceiptNumber}, Phone: ${phoneNumber}, Date: ${transactionDate}`,
        },
      });

      logger.info(`Order ${order.orderNumber} marked as PAID. M-Pesa Receipt: ${mpesaReceiptNumber}`);
    } else {
      // Payment failed or cancelled
      logger.warn(`Payment failed for order ${order.orderNumber}: ${ResultDesc}`);

      // Optionally update order with failure reason
      await prisma.order.update({
        where: { id: order.id },
        data: {
          processingNotes: `STK Push failed: ${ResultDesc}`,
        },
      });
    }
  }
}

export const mpesaService = new MpesaService();
