import TronWeb from 'tronweb';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

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
  private tronWeb: TronWeb | null = null;
  private usdtContract: string;

  constructor() {
    this.usdtContract = config.tron.usdtContract || USDT_CONTRACTS[config.tron.network] || USDT_CONTRACTS.mainnet;
  }

  /**
   * Initialize TronWeb instance
   */
  private getTronWeb(): TronWeb {
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
   * Try to match a deposit to a pending order
   */
  private async matchDepositToOrder(
    txHash: string,
    fromAddress: string,
    amount: number
  ): Promise<void> {
    // Find pending CRYPTO_TO_KES orders with matching amount
    // In production, you might use unique deposit addresses per order
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
    }
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
