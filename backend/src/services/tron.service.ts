import { config } from '../config/env';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

// TronWeb doesn't have proper TypeScript types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TronWebModule = require('tronweb');
const TronWeb = TronWebModule.TronWeb || TronWebModule.default || TronWebModule;

const prisma = new PrismaClient();

// USDT TRC-20 Contract Addresses
const USDT_CONTRACTS: Record<string, string> = {
  mainnet: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  shasta: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs', // Shasta testnet USDT
};

interface TransferEvent {
  transaction: string;
  result: {
    from: string;
    to: string;
    value: string;
  };
  block: number;
  timestamp: number;
}

class TronService {
  private tronWeb: any = null;
  private usdtContract: string;

  constructor() {
    this.usdtContract = config.tron.usdtContract || USDT_CONTRACTS[config.tron.network] || USDT_CONTRACTS.mainnet;
  }

  /**
   * Initialize TronWeb instance
   */
  private getTronWeb(): any {
    if (!this.tronWeb) {
      if (!config.tron.apiKey) {
        throw new Error('TRON_API_KEY is not configured');
      }

      const fullHost = config.tron.network === 'mainnet'
        ? 'https://api.trongrid.io'
        : 'https://api.shasta.trongrid.io';

      this.tronWeb = new TronWeb({
        fullHost,
        headers: { 'TRON-PRO-API-KEY': config.tron.apiKey },
        privateKey: config.tron.privateKey || undefined,
      });
    }

    return this.tronWeb;
  }

  /**
   * Get the hot wallet address
   */
  getHotWalletAddress(): string {
    if (config.tron.hotWalletAddress) {
      return config.tron.hotWalletAddress;
    }

    const tronWeb = this.getTronWeb();
    if (tronWeb.defaultAddress?.base58) {
      return tronWeb.defaultAddress.base58;
    }

    throw new Error('Hot wallet address not configured');
  }

  /**
   * Generate a new TRON wallet (for reference/setup)
   */
  async generateWallet(): Promise<{ address: string; privateKey: string }> {
    const tronWeb = this.getTronWeb();
    const account = await tronWeb.createAccount();
    return {
      address: account.address.base58,
      privateKey: account.privateKey,
    };
  }

  /**
   * Get TRX balance of the hot wallet
   */
  async getTrxBalance(): Promise<number> {
    const tronWeb = this.getTronWeb();
    const address = this.getHotWalletAddress();
    const balance = await tronWeb.trx.getBalance(address);
    return balance / 1_000_000; // Convert from SUN to TRX
  }

  /**
   * Get USDT balance of the hot wallet
   */
  async getUsdtBalance(): Promise<number> {
    const tronWeb = this.getTronWeb();
    const address = this.getHotWalletAddress();

    try {
      const contract = await tronWeb.contract().at(this.usdtContract);
      const balance = await contract.balanceOf(address).call();
      return Number(balance) / 1_000_000; // USDT has 6 decimals
    } catch (error: any) {
      logger.error('Failed to get USDT balance:', error.message);
      throw new Error('Failed to get USDT balance');
    }
  }

  /**
   * Get USDT balance of any address
   */
  async getUsdtBalanceOf(address: string): Promise<number> {
    const tronWeb = this.getTronWeb();

    try {
      const contract = await tronWeb.contract().at(this.usdtContract);
      const balance = await contract.balanceOf(address).call();
      return Number(balance) / 1_000_000;
    } catch (error: any) {
      logger.error(`Failed to get USDT balance for ${address}:`, error.message);
      return 0;
    }
  }

  /**
   * Send USDT to an address
   */
  async sendUsdt(
    toAddress: string,
    amount: number,
    orderId?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!config.tron.privateKey) {
      return { success: false, error: 'Private key not configured' };
    }

    const tronWeb = this.getTronWeb();

    try {
      // Validate address
      if (!tronWeb.isAddress(toAddress)) {
        return { success: false, error: 'Invalid TRON address' };
      }

      // Check balance
      const balance = await this.getUsdtBalance();
      if (balance < amount) {
        return { success: false, error: `Insufficient USDT balance. Have: ${balance}, Need: ${amount}` };
      }

      // Get contract instance
      const contract = await tronWeb.contract().at(this.usdtContract);

      // Amount in smallest unit (6 decimals for USDT)
      const amountInSun = Math.floor(amount * 1_000_000);

      logger.info(`Sending ${amount} USDT to ${toAddress}`);

      // Send transaction
      const tx = await contract.transfer(toAddress, amountInSun).send({
        feeLimit: 50_000_000, // 50 TRX max fee
      });

      const txHash = typeof tx === 'string' ? tx : tx.txid || tx.transaction?.txID;

      logger.info(`USDT sent successfully. TX Hash: ${txHash}`);

      // Store in database
      await prisma.cryptoTransaction.create({
        data: {
          type: 'WITHDRAWAL',
          status: 'PENDING',
          currency: 'USDT',
          network: 'TRON',
          txHash,
          fromAddress: this.getHotWalletAddress(),
          toAddress,
          amount,
          orderId,
          notes: `Sent ${amount} USDT to ${toAddress}`,
        },
      });

      return { success: true, txHash };
    } catch (error: any) {
      logger.error('Failed to send USDT:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for new incoming USDT deposits
   */
  async checkNewDeposits(): Promise<number> {
    const tronWeb = this.getTronWeb();
    const hotWallet = this.getHotWalletAddress();
    const hotWalletHex = tronWeb.address.toHex(hotWallet);

    try {
      // Get last checked timestamp
      const lastCheck = await prisma.systemConfig.findUnique({
        where: { key: 'lastTronCheckTimestamp' },
      });

      const sinceTimestamp = lastCheck
        ? parseInt(lastCheck.value)
        : Date.now() - 3600000; // Default: last 1 hour

      // Query transfer events to our hot wallet
      const events = await tronWeb.getEventResult(this.usdtContract, {
        eventName: 'Transfer',
        sinceTimestamp,
        filters: { to: hotWalletHex },
      }) as TransferEvent[];

      let newDeposits = 0;

      for (const event of events) {
        const txHash = event.transaction;
        const amount = Number(event.result.value) / 1_000_000;
        const fromAddress = tronWeb.address.fromHex(event.result.from);

        // Check if already processed
        const existing = await prisma.cryptoTransaction.findUnique({
          where: { txHash },
        });

        if (!existing && amount > 0) {
          logger.info(`New USDT deposit detected: ${amount} USDT from ${fromAddress}`);

          // Store the deposit
          await prisma.cryptoTransaction.create({
            data: {
              type: 'DEPOSIT',
              status: 'CONFIRMED',
              currency: 'USDT',
              network: 'TRON',
              txHash,
              fromAddress,
              toAddress: hotWallet,
              amount,
              blockNumber: BigInt(event.block),
              confirmations: 19, // TRON is fast, assume confirmed
              confirmedAt: new Date(event.timestamp),
              notes: `Deposit of ${amount} USDT from ${fromAddress}`,
            },
          });

          // Try to match with a pending order
          await this.matchDepositToOrder(txHash, fromAddress, amount);

          newDeposits++;
        }
      }

      // Update last checked timestamp
      await prisma.systemConfig.upsert({
        where: { key: 'lastTronCheckTimestamp' },
        update: { value: Date.now().toString() },
        create: { key: 'lastTronCheckTimestamp', value: Date.now().toString() },
      });

      if (newDeposits > 0) {
        logger.info(`Processed ${newDeposits} new USDT deposits`);
      }

      return newDeposits;
    } catch (error: any) {
      logger.error('Failed to check TRON deposits:', error.message);
      return 0;
    }
  }

  /**
   * Try to match a deposit to a pending deposit intent or order
   */
  private async matchDepositToOrder(
    txHash: string,
    fromAddress: string,
    amount: number
  ): Promise<void> {
    // First, try to match to pending USDT deposit intents (user-initiated)
    const pendingDeposit = await prisma.pendingUsdtDeposit.findFirst({
      where: {
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        // Match by approximate amount (within 0.5 USDT tolerance)
        expectedAmount: {
          gte: amount - 0.5,
          lte: amount + 0.5,
        },
      },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });

    if (pendingDeposit) {
      logger.info(`Matched deposit ${txHash} to pending intent ${pendingDeposit.id} for user ${pendingDeposit.userId}`);

      // Get current exchange rate
      const rate = await prisma.exchangeRate.findFirst({
        where: { pair: 'USDT_KES', isActive: true },
      });

      if (!rate) {
        logger.error('No USDT/KES rate found, cannot process deposit');
        return;
      }

      const exchangeRate = Number(rate.buyRate);
      const kesAmount = amount * exchangeRate;

      // Use transaction for atomicity
      await prisma.$transaction(async (tx) => {
        // Update the pending deposit as matched
        await tx.pendingUsdtDeposit.update({
          where: { id: pendingDeposit.id },
          data: {
            status: 'MATCHED',
            matchedTxHash: txHash,
            matchedAmount: amount,
            kesAmount,
            exchangeRate,
            matchedAt: new Date(),
          },
        });

        // Get or create user balance
        let userBalance = await tx.userBalance.findUnique({
          where: { userId: pendingDeposit.userId },
        });

        if (!userBalance) {
          userBalance = await tx.userBalance.create({
            data: {
              userId: pendingDeposit.userId,
              balance: 0,
              usdtBalance: 0,
              currency: 'KES',
            },
          });
        }

        const currentKesBalance = Number(userBalance.balance);
        const newKesBalance = currentKesBalance + kesAmount;

        // Credit KES balance
        await tx.userBalance.update({
          where: { userId: pendingDeposit.userId },
          data: { balance: newKesBalance },
        });

        // Create balance transaction record
        await tx.balanceTransaction.create({
          data: {
            userBalanceId: userBalance.id,
            type: 'USDT_DEPOSIT',
            status: 'COMPLETED',
            currency: 'KES',
            amount: kesAmount,
            balanceBefore: currentKesBalance,
            balanceAfter: newKesBalance,
            txHash,
            walletAddress: fromAddress,
            reference: txHash,
            description: `USDT deposit: ${amount} USDT → KES ${kesAmount.toFixed(2)} @ ${exchangeRate}`,
            completedAt: new Date(),
          },
        });

        // Link crypto transaction
        await tx.cryptoTransaction.update({
          where: { txHash },
          data: { status: 'COMPLETED' },
        });
      });

      logger.info(`Credited KES ${kesAmount.toFixed(2)} to user ${pendingDeposit.userId} from ${amount} USDT deposit`);
      return;
    }

    // Fallback: try to match to pending CRYPTO_TO_KES orders
    const pendingOrder = await prisma.order.findFirst({
      where: {
        orderType: 'CRYPTO_TO_KES',
        status: 'PENDING',
        sourceCurrency: 'USDT',
        // Match by approximate amount (within 0.01 USDT tolerance)
        sourceAmount: {
          gte: amount - 0.01,
          lte: amount + 0.01,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (pendingOrder) {
      logger.info(`Matched deposit ${txHash} to order ${pendingOrder.orderNumber}`);

      // Update the order
      await prisma.order.update({
        where: { id: pendingOrder.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentMethod: 'TRON_USDT',
          paymentReference: txHash,
          processingNotes: `USDT received from ${fromAddress}`,
        },
      });

      // Link the crypto transaction to the order
      await prisma.cryptoTransaction.update({
        where: { txHash },
        data: {
          orderId: pendingOrder.id,
          status: 'COMPLETED',
        },
      });
    } else {
      logger.warn(`Unmatched deposit: ${amount} USDT from ${fromAddress}, txHash: ${txHash}`);
    }
  }

  /**
   * Create a pending deposit intent for a user
   */
  async createDepositIntent(
    userId: string,
    expectedAmount: number
  ): Promise<{ id: string; expectedAmount: number; expiresAt: Date; depositAddress: string; exchangeRate: number; estimatedKes: number }> {
    // Validate amount
    if (expectedAmount < 1) {
      throw new Error('Minimum deposit is 1 USDT');
    }
    if (expectedAmount > 100000) {
      throw new Error('Maximum deposit is 100,000 USDT');
    }

    // Get current exchange rate
    const rate = await prisma.exchangeRate.findFirst({
      where: { pair: 'USDT_KES', isActive: true },
    });

    if (!rate) {
      throw new Error('Exchange rate not available');
    }

    const exchangeRate = Number(rate.buyRate);
    const estimatedKes = expectedAmount * exchangeRate;

    // Expire any existing pending intents for this user
    await prisma.pendingUsdtDeposit.updateMany({
      where: {
        userId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Create new pending deposit intent (expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const intent = await prisma.pendingUsdtDeposit.create({
      data: {
        userId,
        expectedAmount,
        exchangeRate,
        kesAmount: estimatedKes,
        expiresAt,
      },
    });

    logger.info(`Created deposit intent for user ${userId}: ${expectedAmount} USDT, expected KES ${estimatedKes.toFixed(2)}`);

    return {
      id: intent.id,
      expectedAmount,
      expiresAt,
      depositAddress: this.getHotWalletAddress(),
      exchangeRate,
      estimatedKes,
    };
  }

  /**
   * Get user's pending deposit intent
   */
  async getPendingDepositIntent(userId: string) {
    const intent = await prisma.pendingUsdtDeposit.findFirst({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!intent) {
      return null;
    }

    return {
      id: intent.id,
      expectedAmount: Number(intent.expectedAmount),
      kesAmount: Number(intent.kesAmount),
      exchangeRate: Number(intent.exchangeRate),
      expiresAt: intent.expiresAt,
      createdAt: intent.createdAt,
    };
  }

  /**
   * Clean up expired deposit intents
   */
  async cleanupExpiredIntents(): Promise<number> {
    const result = await prisma.pendingUsdtDeposit.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      logger.info(`Expired ${result.count} pending deposit intents`);
    }

    return result.count;
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash: string): Promise<any> {
    const tronWeb = this.getTronWeb();
    try {
      const tx = await tronWeb.trx.getTransaction(txHash);
      const txInfo = await tronWeb.trx.getTransactionInfo(txHash);
      return { tx, txInfo };
    } catch (error: any) {
      logger.error(`Failed to get transaction ${txHash}:`, error.message);
      return null;
    }
  }

  /**
   * Validate a TRON address
   */
  isValidAddress(address: string): boolean {
    const tronWeb = this.getTronWeb();
    return tronWeb.isAddress(address);
  }

  /**
   * Get recent transactions from database
   */
  async getRecentTransactions(params: {
    page?: number;
    limit?: number;
    type?: 'DEPOSIT' | 'WITHDRAWAL';
    status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
  }) {
    const { page = 1, limit = 20, type, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.cryptoTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: { orderNumber: true },
          },
        },
      }),
      prisma.cryptoTransaction.count({ where }),
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
   * Get wallet summary
   */
  async getWalletSummary() {
    try {
      const [trxBalance, usdtBalance] = await Promise.all([
        this.getTrxBalance(),
        this.getUsdtBalance(),
      ]);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [todayDeposits, todayWithdrawals] = await Promise.all([
        prisma.cryptoTransaction.aggregate({
          where: {
            type: 'DEPOSIT',
            status: { in: ['CONFIRMED', 'COMPLETED'] },
            createdAt: { gte: todayStart },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.cryptoTransaction.aggregate({
          where: {
            type: 'WITHDRAWAL',
            status: { in: ['CONFIRMED', 'COMPLETED'] },
            createdAt: { gte: todayStart },
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      return {
        hotWallet: this.getHotWalletAddress(),
        network: config.tron.network,
        balances: {
          trx: trxBalance,
          usdt: usdtBalance,
        },
        today: {
          deposits: {
            count: todayDeposits._count,
            amount: Number(todayDeposits._sum.amount) || 0,
          },
          withdrawals: {
            count: todayWithdrawals._count,
            amount: Number(todayWithdrawals._sum.amount) || 0,
          },
        },
      };
    } catch (error: any) {
      logger.error('Failed to get wallet summary:', error.message);
      throw error;
    }
  }
}

export const tronService = new TronService();
