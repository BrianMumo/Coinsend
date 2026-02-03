import { PrismaClient, OrderType, OrderStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { CreateOrderRequest, PaginationParams } from '../types';
import { rateService } from './rate.service';

const prisma = new PrismaClient();

export class OrderService {
  async createOrder(userId: string, data: CreateOrderRequest) {
    // Calculate rate and destination amount
    const rateInfo = await rateService.calculateRate({
      sourceCurrency: data.sourceCurrency,
      destinationCurrency: data.destinationCurrency,
      amount: data.sourceAmount,
      direction: data.orderType === 'CRYPTO_TO_KES' ? 'sell' : 'buy',
    });

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        orderType: data.orderType,
        sourceCurrency: data.sourceCurrency,
        destinationCurrency: data.destinationCurrency,
        sourceAmount: data.sourceAmount,
        destinationAmount: rateInfo.destinationAmount,
        exchangeRate: rateInfo.exchangeRate,
        fee: rateInfo.fee,
        payoutDestination: data.payoutDestination,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        recipientBank: data.recipientBank,
        recipientAccount: data.recipientAccount,
        expiresAt,
      },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get payment instructions based on order type
    const paymentInstructions = this.getPaymentInstructions(order);

    return { order, paymentInstructions };
  }

  async getOrderById(orderId: string, userId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        processedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // If userId is provided, verify ownership
    if (userId && order.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    const paymentInstructions = this.getPaymentInstructions(order);

    return { order, paymentInstructions };
  }

  async getUserOrders(userId: string, params: PaginationParams & { status?: OrderStatus; orderType?: OrderType }) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', status, orderType } = params;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status }),
      ...(orderType && { orderType }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async submitPaymentProof(orderId: string, userId: string, proofUrl: string, paymentReference?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    if (order.status !== 'PENDING') {
      throw new AppError(`Cannot submit proof for order with status: ${order.status}`, 400);
    }

    // Check if order has expired
    if (order.expiresAt && new Date() > order.expiresAt) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('Order has expired', 400);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paymentProofUrl: proofUrl,
        paymentReference,
        paidAt: new Date(),
      },
    });

    return updatedOrder;
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    if (!['PENDING', 'PAID'].includes(order.status)) {
      throw new AppError(`Cannot cancel order with status: ${order.status}`, 400);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    return updatedOrder;
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of orders today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `CS-${dateStr}-${sequence}`;
  }

  private getPaymentInstructions(order: any) {
    const instructions: any = {};

    switch (order.orderType) {
      case 'CRYPTO_TO_KES':
        // User sends crypto to our wallet
        instructions.type = 'crypto_deposit';
        instructions.message = 'Send crypto to the address below';
        instructions.details = {
          currency: order.sourceCurrency,
          amount: order.sourceAmount.toString(),
          // In production, fetch actual wallet from database
          walletAddress: this.getMockWalletAddress(order.sourceCurrency),
          network: this.getNetwork(order.sourceCurrency),
        };
        instructions.note = 'After sending, submit your transaction hash as proof of payment';
        break;

      case 'KES_TO_CRYPTO':
        // User sends KES via M-Pesa
        instructions.type = 'mpesa_payment';
        instructions.message = 'Send KES via M-Pesa';
        instructions.details = {
          amount: order.sourceAmount.toString(),
          paybillNumber: '123456',
          accountNumber: order.orderNumber,
          businessName: 'Coinsend Ltd',
        };
        instructions.note = 'Use your order number as the account number';
        break;

      case 'CROSS_BORDER':
        // User sends KES via M-Pesa
        instructions.type = 'mpesa_payment';
        instructions.message = `Send KES for cross-border transfer to ${order.destinationCurrency}`;
        instructions.details = {
          amount: order.sourceAmount.toString(),
          paybillNumber: '123456',
          accountNumber: order.orderNumber,
          businessName: 'Coinsend Ltd',
        };
        instructions.note = 'Funds will be delivered to recipient within 24-48 hours';
        break;

      case 'OTC':
        instructions.type = 'otc_trade';
        instructions.message = 'OTC trade request received';
        instructions.details = {
          amount: order.sourceAmount.toString(),
          currency: order.sourceCurrency,
        };
        instructions.note = 'Our team will contact you within 24 hours to finalize the trade';
        break;
    }

    return instructions;
  }

  private getMockWalletAddress(currency: string): string {
    // Mock wallet addresses for MVP
    const wallets: Record<string, string> = {
      USDT: 'TXYZabc123def456ghi789jkl012mno345',
      USDC: '0x1234567890abcdef1234567890abcdef12345678',
      BTC: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      ETH: '0xabcdef1234567890abcdef1234567890abcdef12',
    };
    return wallets[currency] || wallets.USDT;
  }

  private getNetwork(currency: string): string {
    const networks: Record<string, string> = {
      USDT: 'TRC20 (Tron)',
      USDC: 'ERC20 (Ethereum)',
      BTC: 'Bitcoin',
      ETH: 'Ethereum',
    };
    return networks[currency] || 'TRC20 (Tron)';
  }
}

export const orderService = new OrderService();
