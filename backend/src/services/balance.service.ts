import { PrismaClient, BalanceTransactionType, BalanceTransactionStatus } from '@prisma/client';
import { mpesaService } from './mpesa.service';
import { tronService } from './tron.service';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface BalanceWithHistory {
  balance: {
    id: string;
    balance: string;
    usdtBalance: string;
    currency: string;
    updatedAt: Date;
  };
  transactions: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class BalanceService {
  /**
   * Get or create user balance record
   */
  async getOrCreateBalance(userId: string) {
    let balance = await prisma.userBalance.findUnique({
      where: { userId },
    });

    if (!balance) {
      balance = await prisma.userBalance.create({
        data: {
          userId,
          balance: 0,
          usdtBalance: 0,
          currency: 'KES',
        },
      });
      logger.info(`Created new balance record for user ${userId}`);
    }

    return balance;
  }

  /**
   * Get balance with transaction history
   */
  async getBalanceWithHistory(
    userId: string,
    params: PaginationParams = {}
  ): Promise<BalanceWithHistory> {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const balance = await this.getOrCreateBalance(userId);

    const [transactions, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where: { userBalanceId: balance.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: { orderNumber: true },
          },
        },
      }),
      prisma.balanceTransaction.count({
        where: { userBalanceId: balance.id },
      }),
    ]);

    return {
      balance: {
        id: balance.id,
        balance: balance.balance.toString(),
        usdtBalance: balance.usdtBalance.toString(),
        currency: balance.currency,
        updatedAt: balance.updatedAt,
      },
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        currency: tx.currency,
        amount: tx.amount.toString(),
        balanceBefore: tx.balanceBefore.toString(),
        balanceAfter: tx.balanceAfter.toString(),
        reference: tx.reference,
        orderId: tx.orderId,
        orderNumber: tx.order?.orderNumber,
        description: tx.description,
        txHash: tx.txHash,
        walletAddress: tx.walletAddress,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get transaction history with filters
   */
  async getTransactionHistory(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      type?: BalanceTransactionType;
      status?: BalanceTransactionStatus;
    }
  ) {
    const { page = 1, limit = 20, type, status } = params;
    const skip = (page - 1) * limit;

    const balance = await this.getOrCreateBalance(userId);

    const where: any = { userBalanceId: balance.id };
    if (type) where.type = type;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: { orderNumber: true, orderType: true },
          },
        },
      }),
      prisma.balanceTransaction.count({ where }),
    ]);

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount.toString(),
        balanceBefore: tx.balanceBefore.toString(),
        balanceAfter: tx.balanceAfter.toString(),
        reference: tx.reference,
        orderId: tx.orderId,
        orderNumber: tx.order?.orderNumber,
        orderType: tx.order?.orderType,
        description: tx.description,
        phoneNumber: tx.phoneNumber,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Initiate deposit via M-Pesa STK Push
   */
  async initiateDeposit(
    userId: string,
    amount: number,
    phoneNumber: string
  ): Promise<{
    transaction: any;
    stkResponse: any;
  }> {
    // Validate amount
    if (amount < 10) {
      throw new AppError('Minimum deposit is KES 10', 400);
    }
    if (amount > 150000) {
      throw new AppError('Maximum deposit is KES 150,000', 400);
    }

    const balance = await this.getOrCreateBalance(userId);
    const currentBalance = Number(balance.balance);

    // Create pending transaction
    const transaction = await prisma.balanceTransaction.create({
      data: {
        userBalanceId: balance.id,
        type: 'DEPOSIT',
        status: 'PENDING',
        amount,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance, // Will be updated on success
        phoneNumber,
        description: `Deposit via M-Pesa`,
      },
    });

    try {
      // Initiate STK Push
      const stkResponse = await mpesaService.initiateSTKPush(
        phoneNumber,
        amount,
        `DEPOSIT-${transaction.id.slice(0, 8).toUpperCase()}`,
        'Coinsend Wallet Deposit'
      );

      // Update transaction with CheckoutRequestID as reference
      await prisma.balanceTransaction.update({
        where: { id: transaction.id },
        data: {
          reference: stkResponse.CheckoutRequestID,
        },
      });

      logger.info(`Deposit initiated for user ${userId}, Amount: ${amount}, TxID: ${transaction.id}`);

      return {
        transaction: {
          id: transaction.id,
          amount: transaction.amount.toString(),
          status: transaction.status,
        },
        stkResponse,
      };
    } catch (error: any) {
      // Mark transaction as failed
      await prisma.balanceTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          description: `Deposit failed: ${error.message}`,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Process deposit callback from M-Pesa
   */
  async processDepositCallback(
    checkoutRequestId: string,
    success: boolean,
    mpesaReceiptNumber?: string
  ): Promise<void> {
    // Find pending deposit transaction by reference (CheckoutRequestID)
    const transaction = await prisma.balanceTransaction.findFirst({
      where: {
        reference: checkoutRequestId,
        type: 'DEPOSIT',
        status: 'PENDING',
      },
      include: {
        userBalance: true,
      },
    });

    if (!transaction) {
      logger.warn(`No pending deposit found for CheckoutRequestID: ${checkoutRequestId}`);
      return;
    }

    if (success) {
      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        const currentBalance = Number(transaction.userBalance.balance);
        const depositAmount = Number(transaction.amount);
        const newBalance = currentBalance + depositAmount;

        // Update balance
        await tx.userBalance.update({
          where: { id: transaction.userBalanceId },
          data: { balance: newBalance },
        });

        // Update transaction
        await tx.balanceTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            balanceAfter: newBalance,
            reference: mpesaReceiptNumber || checkoutRequestId,
            description: `Deposit completed. Receipt: ${mpesaReceiptNumber || 'N/A'}`,
            completedAt: new Date(),
          },
        });
      });

      logger.info(`Deposit completed for transaction ${transaction.id}, Amount: ${transaction.amount}`);
    } else {
      // Mark as failed
      await prisma.balanceTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          description: 'M-Pesa payment failed or cancelled',
          completedAt: new Date(),
        },
      });

      logger.warn(`Deposit failed for transaction ${transaction.id}`);
    }
  }

  /**
   * Initiate withdrawal via M-Pesa B2C
   */
  async initiateWithdrawal(
    userId: string,
    amount: number,
    phoneNumber: string
  ): Promise<{ transaction: any }> {
    // Validate amount
    if (amount < 10) {
      throw new AppError('Minimum withdrawal is KES 10', 400);
    }
    if (amount > 70000) {
      throw new AppError('Maximum withdrawal is KES 70,000', 400);
    }

    const balance = await this.getOrCreateBalance(userId);
    const currentBalance = Number(balance.balance);

    // Check sufficient balance
    if (currentBalance < amount) {
      throw new AppError('Insufficient balance', 400);
    }

    // Use transaction for atomic balance check and deduction
    const result = await prisma.$transaction(async (tx) => {
      // Double-check balance inside transaction
      const freshBalance = await tx.userBalance.findUnique({
        where: { userId },
      });

      if (!freshBalance || Number(freshBalance.balance) < amount) {
        throw new AppError('Insufficient balance', 400);
      }

      const newBalance = Number(freshBalance.balance) - amount;

      // Deduct balance immediately (will be refunded if B2C fails)
      await tx.userBalance.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // Create pending transaction
      const transaction = await tx.balanceTransaction.create({
        data: {
          userBalanceId: freshBalance.id,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          amount: -amount, // Negative for withdrawals
          balanceBefore: freshBalance.balance,
          balanceAfter: newBalance,
          phoneNumber,
          description: 'Withdrawal to M-Pesa',
        },
      });

      return { transaction, newBalance };
    });

    try {
      // Initiate B2C payment
      const b2cResponse = await mpesaService.initiateB2CPayment(
        phoneNumber,
        amount,
        'BusinessPayment',
        'Coinsend Wallet Withdrawal'
      );

      // Update transaction with OriginatorConversationID as reference
      await prisma.balanceTransaction.update({
        where: { id: result.transaction.id },
        data: {
          reference: b2cResponse.OriginatorConversationID,
        },
      });

      logger.info(`Withdrawal initiated for user ${userId}, Amount: ${amount}`);

      return {
        transaction: {
          id: result.transaction.id,
          amount: Math.abs(Number(result.transaction.amount)).toString(),
          status: result.transaction.status,
        },
      };
    } catch (error: any) {
      // Refund the balance
      await prisma.$transaction(async (tx) => {
        await tx.userBalance.update({
          where: { userId },
          data: { balance: { increment: amount } },
        });

        await tx.balanceTransaction.update({
          where: { id: result.transaction.id },
          data: {
            status: 'FAILED',
            description: `Withdrawal failed: ${error.message}`,
            completedAt: new Date(),
          },
        });
      });

      throw error;
    }
  }

  /**
   * Process withdrawal callback from M-Pesa B2C
   */
  async processWithdrawalCallback(
    originatorConversationId: string,
    success: boolean,
    mpesaReceiptNumber?: string
  ): Promise<void> {
    // Find pending withdrawal transaction
    const transaction = await prisma.balanceTransaction.findFirst({
      where: {
        reference: originatorConversationId,
        type: 'WITHDRAWAL',
        status: 'PENDING',
      },
      include: {
        userBalance: true,
      },
    });

    if (!transaction) {
      logger.warn(`No pending withdrawal found for OriginatorConversationID: ${originatorConversationId}`);
      return;
    }

    if (success) {
      // Mark as completed
      await prisma.balanceTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          reference: mpesaReceiptNumber || originatorConversationId,
          description: `Withdrawal completed. Receipt: ${mpesaReceiptNumber || 'N/A'}`,
          completedAt: new Date(),
        },
      });

      logger.info(`Withdrawal completed for transaction ${transaction.id}`);
    } else {
      // Refund the balance
      const refundAmount = Math.abs(Number(transaction.amount));

      await prisma.$transaction(async (tx) => {
        await tx.userBalance.update({
          where: { id: transaction.userBalanceId },
          data: { balance: { increment: refundAmount } },
        });

        await tx.balanceTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            description: 'B2C payment failed - balance refunded',
            completedAt: new Date(),
          },
        });
      });

      logger.warn(`Withdrawal failed for transaction ${transaction.id}, balance refunded`);
    }
  }

  /**
   * Pay for order from balance (atomic operation)
   */
  async payFromBalance(
    userId: string,
    orderId: string,
    amount: number
  ): Promise<{
    success: boolean;
    transaction: any;
    newBalance: number;
  }> {
    const result = await prisma.$transaction(async (tx) => {
      // Get and lock balance
      const balance = await tx.userBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        throw new AppError('Balance not found', 404);
      }

      const currentBalance = Number(balance.balance);

      if (currentBalance < amount) {
        throw new AppError('Insufficient balance', 400);
      }

      const newBalance = currentBalance - amount;

      // Deduct balance
      await tx.userBalance.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // Create transaction record
      const transaction = await tx.balanceTransaction.create({
        data: {
          userBalanceId: balance.id,
          type: 'ORDER_PAYMENT',
          status: 'COMPLETED',
          amount: -amount, // Negative for payments
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          orderId,
          description: 'Order payment from balance',
          completedAt: new Date(),
        },
      });

      return { transaction, newBalance };
    });

    logger.info(`Balance payment of ${amount} for order ${orderId} by user ${userId}`);

    return {
      success: true,
      transaction: {
        id: result.transaction.id,
        amount: Math.abs(Number(result.transaction.amount)).toString(),
        status: result.transaction.status,
      },
      newBalance: result.newBalance,
    };
  }

  /**
   * Refund balance for cancelled order
   */
  async refundToBalance(
    userId: string,
    orderId: string,
    amount: number,
    reason: string = 'Order cancelled'
  ): Promise<{
    transaction: any;
    newBalance: number;
  }> {
    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.userBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        throw new AppError('Balance not found', 404);
      }

      const currentBalance = Number(balance.balance);
      const newBalance = currentBalance + amount;

      // Add refund to balance
      await tx.userBalance.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // Create refund transaction
      const transaction = await tx.balanceTransaction.create({
        data: {
          userBalanceId: balance.id,
          type: 'ORDER_REFUND',
          status: 'COMPLETED',
          amount: amount, // Positive for refunds
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          orderId,
          description: reason,
          completedAt: new Date(),
        },
      });

      return { transaction, newBalance };
    });

    logger.info(`Refunded ${amount} to user ${userId} for order ${orderId}`);

    return {
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount.toString(),
        status: result.transaction.status,
      },
      newBalance: result.newBalance,
    };
  }

  /**
   * Check deposit transaction status
   */
  async checkDepositStatus(transactionId: string, userId: string) {
    const transaction = await prisma.balanceTransaction.findFirst({
      where: {
        id: transactionId,
        type: 'DEPOSIT',
        userBalance: { userId },
      },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    return {
      id: transaction.id,
      status: transaction.status,
      isCompleted: transaction.status === 'COMPLETED',
      amount: transaction.amount.toString(),
      reference: transaction.reference,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    };
  }

  // ============ USDT BALANCE METHODS ============

  /**
   * Get the deposit address for USDT (shared hot wallet)
   */
  getUsdtDepositAddress(): string {
    return tronService.getHotWalletAddress();
  }

  /**
   * Credit USDT to user balance (called when deposit is detected)
   */
  async creditUsdt(
    userId: string,
    amount: number,
    txHash: string,
    fromAddress: string
  ): Promise<{ transaction: any; newBalance: number }> {
    const result = await prisma.$transaction(async (tx) => {
      // Get or create balance
      let balance = await tx.userBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        balance = await tx.userBalance.create({
          data: {
            userId,
            balance: 0,
            usdtBalance: 0,
            currency: 'KES',
          },
        });
      }

      const currentBalance = Number(balance.usdtBalance);
      const newBalance = currentBalance + amount;

      // Update USDT balance
      await tx.userBalance.update({
        where: { userId },
        data: { usdtBalance: newBalance },
      });

      // Create transaction record
      const transaction = await tx.balanceTransaction.create({
        data: {
          userBalanceId: balance.id,
          type: 'USDT_DEPOSIT',
          status: 'COMPLETED',
          currency: 'USDT',
          amount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          txHash,
          walletAddress: fromAddress,
          description: `USDT deposit from ${fromAddress.slice(0, 8)}...`,
          completedAt: new Date(),
        },
      });

      return { transaction, newBalance };
    });

    logger.info(`Credited ${amount} USDT to user ${userId}, txHash: ${txHash}`);

    return {
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount.toString(),
        status: result.transaction.status,
      },
      newBalance: result.newBalance,
    };
  }

  /**
   * Withdraw USDT from user balance to external wallet
   */
  async withdrawUsdt(
    userId: string,
    amount: number,
    toAddress: string
  ): Promise<{ transaction: any; txHash?: string }> {
    // Validate amount
    if (amount < 1) {
      throw new AppError('Minimum USDT withdrawal is 1 USDT', 400);
    }
    if (amount > 10000) {
      throw new AppError('Maximum USDT withdrawal is 10,000 USDT', 400);
    }

    // Validate address
    if (!tronService.isValidAddress(toAddress)) {
      throw new AppError('Invalid TRON wallet address', 400);
    }

    // Use transaction for atomic balance check and deduction
    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.userBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        throw new AppError('Balance not found', 404);
      }

      const currentBalance = Number(balance.usdtBalance);

      if (currentBalance < amount) {
        throw new AppError('Insufficient USDT balance', 400);
      }

      const newBalance = currentBalance - amount;

      // Deduct balance immediately
      await tx.userBalance.update({
        where: { userId },
        data: { usdtBalance: newBalance },
      });

      // Create pending transaction
      const transaction = await tx.balanceTransaction.create({
        data: {
          userBalanceId: balance.id,
          type: 'USDT_WITHDRAWAL',
          status: 'PENDING',
          currency: 'USDT',
          amount: -amount, // Negative for withdrawals
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          walletAddress: toAddress,
          description: `USDT withdrawal to ${toAddress.slice(0, 8)}...`,
        },
      });

      return { transaction, currentBalance, newBalance };
    });

    // Send USDT from hot wallet
    try {
      const sendResult = await tronService.sendUsdt(toAddress, amount);

      if (sendResult.success && sendResult.txHash) {
        // Update transaction with success
        await prisma.balanceTransaction.update({
          where: { id: result.transaction.id },
          data: {
            status: 'COMPLETED',
            txHash: sendResult.txHash,
            description: `USDT sent. TX: ${sendResult.txHash.slice(0, 16)}...`,
            completedAt: new Date(),
          },
        });

        logger.info(`USDT withdrawal completed for user ${userId}, Amount: ${amount}, TX: ${sendResult.txHash}`);

        return {
          transaction: {
            id: result.transaction.id,
            amount: Math.abs(Number(result.transaction.amount)).toString(),
            status: 'COMPLETED',
          },
          txHash: sendResult.txHash,
        };
      } else {
        throw new Error(sendResult.error || 'Failed to send USDT');
      }
    } catch (error: any) {
      // Refund the balance
      await prisma.$transaction(async (tx) => {
        await tx.userBalance.update({
          where: { userId },
          data: { usdtBalance: { increment: amount } },
        });

        await tx.balanceTransaction.update({
          where: { id: result.transaction.id },
          data: {
            status: 'FAILED',
            description: `Withdrawal failed: ${error.message}`,
            completedAt: new Date(),
          },
        });
      });

      logger.error(`USDT withdrawal failed for user ${userId}: ${error.message}`);
      throw new AppError(`Withdrawal failed: ${error.message}`, 500);
    }
  }

  /**
   * Get USDT transaction history for user
   */
  async getUsdtTransactions(
    userId: string,
    params: { page?: number; limit?: number }
  ) {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const balance = await this.getOrCreateBalance(userId);

    const where = {
      userBalanceId: balance.id,
      currency: 'USDT',
    };

    const [transactions, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.balanceTransaction.count({ where }),
    ]);

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount.toString(),
        balanceBefore: tx.balanceBefore.toString(),
        balanceAfter: tx.balanceAfter.toString(),
        txHash: tx.txHash,
        walletAddress: tx.walletAddress,
        description: tx.description,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const balanceService = new BalanceService();
