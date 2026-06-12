import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { telegramService } from './telegram.service';

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

interface AccountBalanceResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

interface B2CPaymentResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

interface B2CCallbackData {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string;
        Value: string | number;
      }>;
    };
  };
}

interface BalanceCallbackData {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string;
        Value: string | number;
      }>;
    };
  };
}

interface ReversalResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

interface ReversalCallbackData {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string;
        Value: string | number;
      }>;
    };
  };
}

// C2B Confirmation payload sent by Safaricom when a customer pays the paybill directly
interface C2BConfirmationData {
  TransactionType?: string;
  TransID: string;
  TransTime?: string;
  TransAmount: string | number;
  BusinessShortCode?: string;
  BillRefNumber?: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: string | number;
  ThirdPartyTransID?: string;
  MSISDN?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
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
    // Validate credentials are configured
    if (!config.mpesa.consumerKey || !config.mpesa.consumerSecret) {
      logger.error('M-Pesa credentials not configured. Set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET');
      throw new Error('M-Pesa is not configured. Please contact support.');
    }

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
      throw new Error('Failed to authenticate with M-Pesa. Check credentials.');
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
    // Validate required configuration
    if (!config.mpesa.passkey) {
      logger.error('M-Pesa passkey not configured. Set MPESA_PASSKEY');
      throw new Error('M-Pesa is not configured. Please contact support.');
    }
    if (!config.mpesa.callbackUrl) {
      logger.error('M-Pesa callback URL not configured. Set MPESA_CALLBACK_URL');
      throw new Error('M-Pesa is not configured. Please contact support.');
    }

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
      logger.info(`Using shortcode: ${config.mpesa.shortcode}, Callback: ${config.mpesa.callbackUrl}`);

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
      const errorMsg = error.response?.data?.errorMessage || error.response?.data?.ResultDesc || 'Failed to initiate M-Pesa payment';
      throw new Error(errorMsg);
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

    // Extract metadata
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

    // First, check if this is a balance deposit transaction
    const depositTransaction = await prisma.balanceTransaction.findFirst({
      where: {
        reference: CheckoutRequestID,
        type: 'DEPOSIT',
        status: 'PENDING',
      },
    });

    if (depositTransaction) {
      // This is a balance deposit - delegate to balance service
      // Import dynamically to avoid circular dependency
      const { balanceService } = await import('./balance.service');
      await balanceService.processDepositCallback(
        CheckoutRequestID,
        ResultCode === 0,
        mpesaReceiptNumber || undefined
      );
      logger.info(`Processed deposit callback for transaction ${depositTransaction.id}`);
      return;
    }

    // Otherwise, find the order by CheckoutRequestID (stored in paymentReference)
    const order = await prisma.order.findFirst({
      where: {
        paymentReference: CheckoutRequestID,
      },
    });

    if (!order) {
      logger.warn(`No order or deposit found for CheckoutRequestID: ${CheckoutRequestID}`);
      return;
    }

    if (ResultCode === 0) {
      // Payment successful - Update order to PAID status
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

  /**
   * Register C2B Validation & Confirmation URLs with Safaricom.
   * Run once (or whenever the URLs change) so direct paybill deposits are
   * pushed to /api/mpesa/c2b/confirmation.
   */
  async registerC2BUrls(): Promise<any> {
    if (!config.mpesa.c2bConfirmationUrl) {
      throw new Error('MPESA_C2B_CONFIRMATION_URL is not configured.');
    }

    const accessToken = await this.getAccessToken();

    const payload = {
      ShortCode: config.mpesa.shortcode,
      // "Completed" => Safaricom auto-completes if our validation URL is unreachable.
      ResponseType: 'Completed',
      ConfirmationURL: config.mpesa.c2bConfirmationUrl,
      ValidationURL: config.mpesa.c2bValidationUrl || config.mpesa.c2bConfirmationUrl,
    };

    try {
      logger.info(`Registering C2B URLs for shortcode ${config.mpesa.shortcode}`);
      const response = await axios.post(
        `${this.baseUrl}/mpesa/c2b/v1/registerurl`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      logger.info('C2B URL registration response:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('C2B URL registration failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to register C2B URLs');
    }
  }

  /**
   * Process a C2B Confirmation callback — a customer paid the paybill directly.
   * Records the deposit for the admin portal and fires a Telegram notification
   * so deposits can be tracked without logging in.
   */
  async processC2BConfirmation(data: C2BConfirmationData): Promise<void> {
    const transId = data.TransID;
    if (!transId) {
      logger.warn('C2B confirmation received without TransID, ignoring');
      return;
    }

    // Idempotency — Safaricom may retry the confirmation
    const existing = await prisma.mpesaTransaction.findFirst({
      where: { mpesaReceiptNumber: transId, transactionType: 'C2B_PAYBILL' },
    });
    if (existing) {
      logger.info(`C2B confirmation ${transId} already recorded, skipping`);
      return;
    }

    const amount = Number(data.TransAmount) || 0;
    const payerName = [data.FirstName, data.MiddleName, data.LastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const orgBalance = data.OrgAccountBalance != null ? Number(data.OrgAccountBalance) : null;

    await prisma.mpesaTransaction.create({
      data: {
        transactionType: 'C2B_PAYBILL',
        status: 'SUCCESS',
        amount,
        phoneNumber: data.MSISDN || null,
        shortcode: data.BusinessShortCode || config.mpesa.shortcode,
        mpesaReceiptNumber: transId,
        receiverPartyPublicName: payerName || null,
        b2cWorkingBalance: orgBalance ?? undefined,
        notes: data.BillRefNumber ? `Account Ref: ${data.BillRefNumber}` : undefined,
        completedAt: new Date(),
        rawResponse: JSON.parse(JSON.stringify(data)),
      },
    });

    logger.info(`Recorded C2B paybill deposit ${transId}: KES ${amount} from ${payerName || data.MSISDN}`);

    // Notify via Telegram (best-effort, never blocks the callback)
    await telegramService.notifyMpesaDeposit({
      amount,
      payerName: payerName || undefined,
      phoneNumber: data.MSISDN || undefined,
      mpesaReceipt: transId,
      billRefNumber: data.BillRefNumber || undefined,
      orgBalance,
    });
  }

  /**
   * Query Paybill Account Balance
   */
  async queryAccountBalance(): Promise<AccountBalanceResponse> {
    const accessToken = await this.getAccessToken();

    const payload = {
      Initiator: config.mpesa.initiatorName,
      SecurityCredential: config.mpesa.securityCredential,
      CommandID: 'AccountBalance',
      PartyA: config.mpesa.shortcode,
      IdentifierType: '4', // 4 = Paybill
      Remarks: 'Balance query',
      QueueTimeOutURL: `${config.mpesa.timeoutUrl}/balance/timeout`,
      ResultURL: `${config.mpesa.resultUrl}/balance/result`,
    };

    try {
      logger.info('Querying M-Pesa account balance');

      const response = await axios.post(
        `${this.baseUrl}/mpesa/accountbalance/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Log the query in database
      await prisma.mpesaTransaction.create({
        data: {
          transactionType: 'BALANCE_QUERY',
          status: 'PENDING',
          originatorConversationId: response.data.OriginatorConversationID,
          conversationId: response.data.ConversationID,
          amount: 0,
          shortcode: config.mpesa.shortcode,
          rawRequest: { ...payload, SecurityCredential: '[REDACTED]' },
          rawResponse: response.data,
        },
      });

      logger.info('Account balance query initiated:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('Account balance query failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to query account balance');
    }
  }

  /**
   * Initiate B2C Payment (Business to Customer)
   */
  async initiateB2CPayment(
    phoneNumber: string,
    amount: number,
    commandId: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment' = 'BusinessPayment',
    remarks: string = 'Payment',
    orderId?: string,
    adminId?: string
  ): Promise<B2CPaymentResponse> {
    const accessToken = await this.getAccessToken();
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    const payload = {
      InitiatorName: config.mpesa.initiatorName,
      SecurityCredential: config.mpesa.securityCredential,
      CommandID: commandId,
      Amount: Math.round(amount),
      PartyA: config.mpesa.shortcode,
      PartyB: formattedPhone,
      Remarks: remarks,
      QueueTimeOutURL: `${config.mpesa.timeoutUrl}/b2c/timeout`,
      ResultURL: `${config.mpesa.resultUrl}/b2c/result`,
      Occasion: `B2C-${Date.now()}`,
    };

    try {
      logger.info(`Initiating B2C payment to ${formattedPhone}, Amount: ${amount}`);

      const response = await axios.post(
        `${this.baseUrl}/mpesa/b2c/v1/paymentrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Store transaction in database
      await prisma.mpesaTransaction.create({
        data: {
          transactionType: 'B2C_PAYMENT',
          status: 'PENDING',
          originatorConversationId: response.data.OriginatorConversationID,
          conversationId: response.data.ConversationID,
          commandId,
          amount,
          phoneNumber: formattedPhone,
          shortcode: config.mpesa.shortcode,
          orderId,
          initiatedById: adminId,
          notes: remarks,
          rawRequest: { ...payload, SecurityCredential: '[REDACTED]' },
          rawResponse: response.data,
        },
      });

      logger.info('B2C payment initiated:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('B2C payment failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to initiate B2C payment');
    }
  }

  /**
   * Process B2C payment callback from Safaricom
   */
  async processB2CCallback(callbackData: B2CCallbackData): Promise<void> {
    const { Result } = callbackData;
    const { ResultCode, ResultDesc, OriginatorConversationID, TransactionID, ResultParameters } = Result;

    logger.info(`B2C Callback - OriginatorConversationID: ${OriginatorConversationID}, ResultCode: ${ResultCode}`);

    // Find the transaction
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { originatorConversationId: OriginatorConversationID },
    });

    if (!transaction) {
      logger.warn(`No transaction found for OriginatorConversationID: ${OriginatorConversationID}`);
      return;
    }

    // Parse result parameters
    let mpesaReceiptNumber = '';
    let receiverPartyPublicName = '';
    let b2cUtilityBalance: number | null = null;
    let b2cWorkingBalance: number | null = null;

    if (ResultCode === 0 && ResultParameters?.ResultParameter) {
      for (const param of ResultParameters.ResultParameter) {
        switch (param.Key) {
          case 'TransactionReceipt':
            mpesaReceiptNumber = String(param.Value);
            break;
          case 'ReceiverPartyPublicName':
            receiverPartyPublicName = String(param.Value);
            break;
          case 'B2CUtilityAccountAvailableFunds':
            b2cUtilityBalance = Number(param.Value);
            break;
          case 'B2CWorkingAccountAvailableFunds':
            b2cWorkingBalance = Number(param.Value);
            break;
        }
      }
    }

    // Update transaction
    await prisma.mpesaTransaction.update({
      where: { id: transaction.id },
      data: {
        status: ResultCode === 0 ? 'SUCCESS' : 'FAILED',
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        mpesaReceiptNumber: mpesaReceiptNumber || TransactionID,
        receiverPartyPublicName,
        b2cUtilityBalance,
        b2cWorkingBalance,
        completedAt: new Date(),
        rawResponse: JSON.parse(JSON.stringify(callbackData)),
      },
    });

    // If linked to an order, update order status
    if (transaction.orderId && ResultCode === 0) {
      await prisma.order.update({
        where: { id: transaction.orderId },
        data: {
          status: 'COMPLETED',
          payoutReference: mpesaReceiptNumber || TransactionID,
          completedAt: new Date(),
          processingNotes: `B2C payout completed. Receipt: ${mpesaReceiptNumber || TransactionID}`,
        },
      });
    }

    logger.info(`B2C transaction ${OriginatorConversationID} ${ResultCode === 0 ? 'succeeded' : 'failed'}`);
  }

  /**
   * Process Account Balance callback from Safaricom
   */
  async processBalanceCallback(callbackData: BalanceCallbackData): Promise<{
    accountBalance: number | null;
    utilityBalance: number | null;
  }> {
    const { Result } = callbackData;
    const { ResultCode, ResultDesc, OriginatorConversationID, ResultParameters } = Result;

    logger.info(`Balance Callback - OriginatorConversationID: ${OriginatorConversationID}, ResultCode: ${ResultCode}`);

    let accountBalance: number | null = null;
    let utilityBalance: number | null = null;

    if (ResultCode === 0 && ResultParameters?.ResultParameter) {
      for (const param of ResultParameters.ResultParameter) {
        // AccountBalance format: "Working Account|KES|0.00|0.00|0.00|0.00&Utility Account|KES|0.00|0.00|0.00|0.00"
        if (param.Key === 'AccountBalance' && typeof param.Value === 'string') {
          const accounts = param.Value.split('&');
          for (const account of accounts) {
            const parts = account.split('|');
            if (parts[0].includes('Working')) {
              accountBalance = parseFloat(parts[2]) || 0;
            } else if (parts[0].includes('Utility')) {
              utilityBalance = parseFloat(parts[2]) || 0;
            }
          }
        }
      }
    }

    // Update transaction record
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { originatorConversationId: OriginatorConversationID },
    });

    if (transaction) {
      await prisma.mpesaTransaction.update({
        where: { id: transaction.id },
        data: {
          status: ResultCode === 0 ? 'SUCCESS' : 'FAILED',
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          b2cWorkingBalance: accountBalance,
          b2cUtilityBalance: utilityBalance,
          completedAt: new Date(),
          rawResponse: JSON.parse(JSON.stringify(callbackData)),
        },
      });
    }

    logger.info(`Balance query completed. Working: ${accountBalance}, Utility: ${utilityBalance}`);
    return { accountBalance, utilityBalance };
  }

  /**
   * Get transaction history from database
   */
  async getTransactionHistory(params: {
    page?: number;
    limit?: number;
    type?: 'C2B_STK_PUSH' | 'C2B_PAYBILL' | 'B2C_PAYMENT' | 'BALANCE_QUERY';
    status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate,
      search,
    } = params;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.transactionType = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { mpesaReceiptNumber: { contains: search, mode: 'insensitive' } },
        { receiverPartyPublicName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.mpesaTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: { orderNumber: true },
          },
          initiatedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.mpesaTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get latest cached balance (from most recent successful balance query)
   */
  async getLatestBalance(): Promise<{
    workingBalance: number | null;
    utilityBalance: number | null;
    lastUpdated: Date | null;
  }> {
    const latestBalanceQuery = await prisma.mpesaTransaction.findFirst({
      where: {
        transactionType: 'BALANCE_QUERY',
        status: 'SUCCESS',
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      workingBalance: latestBalanceQuery?.b2cWorkingBalance ? Number(latestBalanceQuery.b2cWorkingBalance) : null,
      utilityBalance: latestBalanceQuery?.b2cUtilityBalance ? Number(latestBalanceQuery.b2cUtilityBalance) : null,
      lastUpdated: latestBalanceQuery?.completedAt || null,
    };
  }

  /**
   * Initiate Transaction Reversal
   * Used to reverse a B2C payment that was sent to wrong number
   */
  async initiateReversal(
    transactionId: string, // The M-Pesa receipt number of the transaction to reverse
    amount: number,
    remarks: string = 'Transaction Reversal',
    adminId?: string
  ): Promise<ReversalResponse> {
    const accessToken = await this.getAccessToken();

    // Find the original transaction
    const originalTransaction = await prisma.mpesaTransaction.findFirst({
      where: {
        mpesaReceiptNumber: transactionId,
        transactionType: 'B2C_PAYMENT',
        status: 'SUCCESS',
        isReversed: false,
      },
    });

    if (!originalTransaction) {
      throw new Error('Original transaction not found or already reversed');
    }

    // Use separate reversal credentials (different API operator with reversal permissions)
    const reversalInitiator = config.mpesa.reversalInitiatorName || config.mpesa.initiatorName;
    const reversalCredential = config.mpesa.reversalSecurityCredential || config.mpesa.securityCredential;

    if (!reversalInitiator || !reversalCredential) {
      throw new Error('Reversal credentials not configured. Set MPESA_REVERSAL_INITIATOR_NAME and MPESA_REVERSAL_SECURITY_CREDENTIAL');
    }

    const payload = {
      Initiator: reversalInitiator,
      SecurityCredential: reversalCredential,
      CommandID: 'TransactionReversal',
      TransactionID: transactionId,
      Amount: Math.round(amount),
      ReceiverParty: config.mpesa.shortcode,
      RecieverIdentifierType: 11, // 11 = Organization shortcode identifier
      ResultURL: `${config.mpesa.resultUrl}/reversal/result`,
      QueueTimeOutURL: `${config.mpesa.timeoutUrl}/reversal/timeout`,
      Remarks: remarks,
      Occasion: `REV-${Date.now()}`,
    };

    try {
      logger.info(`Initiating reversal for transaction ${transactionId}, Amount: ${amount}`);
      logger.info(`Using reversal initiator: ${reversalInitiator} (reversal-specific: ${!!config.mpesa.reversalInitiatorName})`);

      const response = await axios.post(
        `${this.baseUrl}/mpesa/reversal/v1/request`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Store reversal transaction in database
      await prisma.mpesaTransaction.create({
        data: {
          transactionType: 'REVERSAL',
          status: 'PENDING',
          originatorConversationId: response.data.OriginatorConversationID,
          conversationId: response.data.ConversationID,
          commandId: 'TransactionReversal',
          amount,
          phoneNumber: originalTransaction.phoneNumber,
          shortcode: config.mpesa.shortcode,
          initiatedById: adminId,
          reversedTransactionId: originalTransaction.id,
          notes: `Reversal of ${transactionId}: ${remarks}`,
          rawRequest: { ...payload, SecurityCredential: '[REDACTED]' },
          rawResponse: response.data,
        },
      });

      logger.info('Reversal initiated:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('Reversal failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to initiate reversal');
    }
  }

  /**
   * Process Reversal callback from Safaricom
   */
  async processReversalCallback(callbackData: ReversalCallbackData): Promise<void> {
    const { Result } = callbackData;
    const { ResultCode, ResultDesc, OriginatorConversationID, TransactionID } = Result;

    logger.info(`Reversal Callback - OriginatorConversationID: ${OriginatorConversationID}, ResultCode: ${ResultCode}`);

    // Find the reversal transaction
    const reversalTransaction = await prisma.mpesaTransaction.findUnique({
      where: { originatorConversationId: OriginatorConversationID },
    });

    if (!reversalTransaction) {
      logger.warn(`No reversal transaction found for OriginatorConversationID: ${OriginatorConversationID}`);
      return;
    }

    // Update reversal transaction
    await prisma.mpesaTransaction.update({
      where: { id: reversalTransaction.id },
      data: {
        status: ResultCode === 0 ? 'SUCCESS' : 'FAILED',
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        mpesaReceiptNumber: TransactionID,
        completedAt: new Date(),
        rawResponse: JSON.parse(JSON.stringify(callbackData)),
      },
    });

    // If reversal successful, mark original transaction as reversed
    if (ResultCode === 0 && reversalTransaction.reversedTransactionId) {
      await prisma.mpesaTransaction.update({
        where: { id: reversalTransaction.reversedTransactionId },
        data: {
          isReversed: true,
          notes: `Reversed on ${new Date().toISOString()}. Reversal receipt: ${TransactionID}`,
        },
      });
      logger.info(`Original transaction ${reversalTransaction.reversedTransactionId} marked as reversed`);
    }

    logger.info(`Reversal ${OriginatorConversationID} ${ResultCode === 0 ? 'succeeded' : 'failed'}: ${ResultDesc}`);
  }

  /**
   * Get transaction by ID for reversal
   */
  async getTransactionForReversal(transactionId: string) {
    return prisma.mpesaTransaction.findFirst({
      where: {
        id: transactionId,
        transactionType: 'B2C_PAYMENT',
        status: 'SUCCESS',
        isReversed: false,
      },
      include: {
        initiatedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }
}

export const mpesaService = new MpesaService();
