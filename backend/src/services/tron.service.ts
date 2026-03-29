import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { telegramService } from './telegram.service';
import { sendUsdtRaw, sendTrxRaw } from '../utils/tron-signing';

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


class TronService {
  private tronWeb: any = null;       // read-only, no private key
  private usdtContract: string;

  constructor() {
    this.usdtContract = config.tron.usdtContract || USDT_CONTRACTS[config.tron.network] || USDT_CONTRACTS.mainnet;
  }

  /**
   * Read-only TronWeb instance — no private key, safe for balance/event queries.
   */
  private getTronWeb(): any {
    if (!this.tronWeb) {
      if (!config.tron.apiKey) {
        throw new Error('TRON_API_KEY is not configured');
      }
      const fullHost = config.tron.network === 'mainnet'
        ? 'https://api.trongrid.io'
        : 'https://api.shasta.trongrid.io';
      // Read-only: no privateKey passed — avoids 'Invalid private key provided' errors
      this.tronWeb = new TronWeb({
        fullHost,
        headers: { 'TRON-PRO-API-KEY': config.tron.apiKey },
      });
      // Set a default address so TRC-20 view calls (balanceOf) work correctly
      if (config.tron.hotWalletAddress) {
        this.tronWeb.setAddress(config.tron.hotWalletAddress);
      }
    }
    return this.tronWeb;
  }

  private get baseUrl(): string {
    return config.tron.network === 'mainnet'
      ? 'https://api.trongrid.io'
      : 'https://api.shasta.trongrid.io';
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
   * Derive a wallet at a specific HD index from the master mnemonic.
   * Uses BIP44 path: m/44'/195'/0'/0/{index}  (195 = TRON coin type)
   * Requires TRON_MNEMONIC env var.
   */
  deriveWallet(index: number): { address: string; privateKey: string } {
    if (!config.tron.mnemonic) {
      throw new Error('TRON_MNEMONIC is not configured. Add it to enable per-user deposit wallets.');
    }
    const path = `m/44'/195'/0'/0/${index}`;
    try {
      // TronWeb 6.x: fromMnemonic returns { address, privateKey, publicKey, mnemonic }
      const wallet = TronWeb.fromMnemonic(config.tron.mnemonic, path);
      const address: string = typeof wallet.address === 'string'
        ? wallet.address
        : wallet.address?.base58 ?? wallet.defaultAddress?.base58;
      const privateKey: string = wallet.privateKey ?? wallet.defaultPrivateKey;
      if (!address || !privateKey) {
        throw new Error(`fromMnemonic returned unexpected shape: ${JSON.stringify(Object.keys(wallet))}`);
      }
      return { address, privateKey };
    } catch (error: any) {
      throw new Error(`HD wallet derivation failed at path ${path}: ${error.message}`);
    }
  }

  /**
   * Get or assign a personal TRC-20 deposit address for a user.
   * Falls back to the hot wallet if TRON_MNEMONIC is not configured.
   */
  async getOrCreateUserDepositAddress(userId: string): Promise<string> {
    // Return existing address if already assigned
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { depositAddress: true, walletIndex: true },
    });

    if (user?.depositAddress) {
      return user.depositAddress;
    }

    // If mnemonic is not configured, fall back to shared hot wallet
    if (!config.tron.mnemonic) {
      logger.warn('TRON_MNEMONIC not set – returning shared hot wallet as deposit address');
      return this.getHotWalletAddress();
    }

    // Get hot wallet address to ensure we never assign it to a user
    let hotWalletLower = '';
    try { hotWalletLower = this.getHotWalletAddress().toLowerCase(); } catch { /* not yet configured */ }

    // Find the next available index (max assigned index + 1)
    const lastUser = await prisma.user.findFirst({
      where: { walletIndex: { not: null } },
      orderBy: { walletIndex: 'desc' },
      select: { walletIndex: true },
    });
    let nextIndex = (lastUser?.walletIndex ?? -1) + 1;

    // Derive address, skipping any index that collides with the hot wallet
    let address = '';
    for (let attempts = 0; attempts < 20; attempts++) {
      const derived = this.deriveWallet(nextIndex);
      if (derived.address.toLowerCase() !== hotWalletLower) {
        address = derived.address;
        break;
      }
      logger.warn(`HD index ${nextIndex} collides with hot wallet address — skipping`);
      nextIndex++;
    }

    if (!address) throw new Error('Could not derive a non-conflicting deposit address');

    await prisma.user.update({
      where: { id: userId },
      data: { depositAddress: address, walletIndex: nextIndex },
    });

    logger.info(`Assigned deposit address ${address} (index ${nextIndex}) to user ${userId}`);
    return address;
  }

  /**
   * Fetch account data from TronGrid REST API (no TronWeb / no private key needed).
   */
  private async fetchAccountData(address: string): Promise<{ trx: number; usdt: number }> {
    const baseUrl = config.tron.network === 'mainnet'
      ? 'https://api.trongrid.io'
      : 'https://api.shasta.trongrid.io';
    try {
      const response = await axios.get(`${baseUrl}/v1/accounts/${address}`, {
        headers: { 'TRON-PRO-API-KEY': config.tron.apiKey },
        timeout: 10000,
      });
      const data = response.data?.data?.[0];
      if (!data) return { trx: 0, usdt: 0 };

      const trx = (data.balance || 0) / 1_000_000;
      const trc20: Array<Record<string, string>> = data.trc20 || [];
      const usdtEntry = trc20.find(t => Object.keys(t)[0]?.toLowerCase() === this.usdtContract.toLowerCase());
      const usdt = usdtEntry ? Number(Object.values(usdtEntry)[0]) / 1_000_000 : 0;
      return { trx, usdt };
    } catch (error: any) {
      logger.error(`Failed to fetch account data for ${address}:`, error.message);
      return { trx: 0, usdt: 0 };
    }
  }

  /**
   * Get TRX balance of the hot wallet
   */
  async getTrxBalance(): Promise<number> {
    const { trx } = await this.fetchAccountData(this.getHotWalletAddress());
    return trx;
  }

  /**
   * Get USDT balance of the hot wallet
   */
  async getUsdtBalance(): Promise<number> {
    const { usdt } = await this.fetchAccountData(this.getHotWalletAddress());
    return usdt;
  }

  /**
   * Get USDT balance of any address
   */
  async getUsdtBalanceOf(address: string): Promise<number> {
    const { usdt } = await this.fetchAccountData(address);
    return usdt;
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

    const readTronWeb = this.getTronWeb();

    try {
      // Validate address
      if (!readTronWeb.isAddress(toAddress)) {
        return { success: false, error: 'Invalid TRON address' };
      }

      // Check balance
      const balance = await this.getUsdtBalance();
      if (balance < amount) {
        return { success: false, error: `Insufficient USDT balance. Have: ${balance}, Need: ${amount}` };
      }

      // Amount in smallest unit (6 decimals for USDT)
      const amountInSun = Math.floor(amount * 1_000_000);

      logger.info(`Sending ${amount} USDT to ${toAddress}`);

      // Use direct API signing — bypasses TronWeb constructor key validation entirely
      const txHash = await this.sendUsdtDirect(
        this.getHotWalletAddress(),
        toAddress,
        amountInSun,
        config.tron.privateKey
      );

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
   * Credit USDT directly to a user whose personal deposit address received funds.
   * Called automatically by the deposit monitor.
   */
  private async creditUserDeposit(
    userId: string,
    txHash: string,
    fromAddress: string,
    amount: number
  ): Promise<void> {
    const rate = await prisma.exchangeRate.findFirst({
      where: { pair: 'USDT_KES', isActive: true },
    });
    const exchangeRate = rate ? Number(rate.buyRate) : 0;
    const kesAmount = amount * exchangeRate;

    await prisma.$transaction(async (tx) => {
      let userBalance = await tx.userBalance.findUnique({ where: { userId } });
      if (!userBalance) {
        userBalance = await tx.userBalance.create({
          data: { userId, balance: 0, usdtBalance: 0, currency: 'KES' },
        });
      }

      const currentUsdt = Number(userBalance.usdtBalance);
      const newUsdt = currentUsdt + amount;

      await tx.userBalance.update({
        where: { userId },
        data: { usdtBalance: newUsdt },
      });

      await tx.balanceTransaction.create({
        data: {
          userBalanceId: userBalance.id,
          type: 'USDT_DEPOSIT',
          status: 'COMPLETED',
          currency: 'USDT',
          amount,
          usdtAmount: amount,
          balanceBefore: currentUsdt,
          balanceAfter: newUsdt,
          txHash,
          walletAddress: fromAddress,
          reference: txHash,
          description: `USDT deposit: ${amount} USDT (≈ KES ${kesAmount.toFixed(2)} @ ${exchangeRate})`,
          completedAt: new Date(),
        },
      });

      await tx.cryptoTransaction.update({
        where: { txHash },
        data: { status: 'COMPLETED' },
      });

      // Mark any matching pending intent as matched
      await tx.pendingUsdtDeposit.updateMany({
        where: {
          userId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
          expectedAmount: { gte: amount - 0.01, lte: amount + 0.01 },
        },
        data: { status: 'MATCHED', matchedTxHash: txHash, matchedAmount: amount, matchedAt: new Date() },
      });
    });

    logger.info(`Credited ${amount} USDT to user ${userId} from personal deposit address (tx: ${txHash})`);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userBalance = await prisma.userBalance.findUnique({ where: { userId } });
    if (user) {
      telegramService.notifyDeposit({
        email: user.email,
        usdtAmount: amount,
        txHash,
        newBalance: Number(userBalance?.usdtBalance || 0),
      }).catch(console.error);
    }
  }

  /**
   * Fetch incoming USDT transfers to an address using TronGrid TRC-20 API.
   * More reliable than getEventResult/event filters.
   */
  private async fetchIncomingUsdt(address: string, sinceTimestamp: number): Promise<Array<{
    txHash: string;
    from: string;
    to: string;
    amount: number;
    blockTimestamp: number;
  }>> {
    const baseUrl = config.tron.network === 'mainnet'
      ? 'https://api.trongrid.io'
      : 'https://api.shasta.trongrid.io';

    // Use a 3-minute buffer to account for TronGrid indexing delay
    const minTimestamp = Math.max(0, sinceTimestamp - 180_000);

    const url = `${baseUrl}/v1/accounts/${address}/transactions/trc20`;
    const response = await axios.get(url, {
      params: {
        only_to: true,
        contract_address: this.usdtContract,
        min_timestamp: minTimestamp,
        limit: 200,
        order_by: 'block_timestamp,asc',
      },
      headers: { 'TRON-PRO-API-KEY': config.tron.apiKey },
      timeout: 15000,
    });

    const data: any[] = response.data?.data || [];
    return data.map((tx: any) => ({
      txHash: tx.transaction_id,
      from: tx.from,
      to: tx.to,
      amount: Number(tx.value) / 1_000_000,
      blockTimestamp: tx.block_timestamp,
    }));
  }

  /**
   * Check for new incoming USDT deposits.
   * Monitors both the shared hot wallet (legacy) and each user's personal deposit address.
   */
  async checkNewDeposits(): Promise<number> {
    const hotWallet = this.getHotWalletAddress();
    let totalDeposits = 0;

    // ── 1. Check hot wallet (legacy / backward-compatible flow) ──────────────
    try {
      const lastCheck = await prisma.systemConfig.findUnique({
        where: { key: 'lastTronCheckTimestamp' },
      });
      const sinceTimestamp = lastCheck
        ? parseInt(lastCheck.value)
        : Date.now() - 3600000;

      const transfers = await this.fetchIncomingUsdt(hotWallet, sinceTimestamp);

      for (const transfer of transfers) {
        const { txHash, from: fromAddress, amount } = transfer;
        const existing = await prisma.cryptoTransaction.findUnique({ where: { txHash } });

        if (!existing && amount > 0) {
          logger.info(`New USDT deposit to hot wallet: ${amount} USDT from ${fromAddress}`);

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
              confirmations: 19,
              confirmedAt: new Date(transfer.blockTimestamp),
              notes: `Deposit of ${amount} USDT from ${fromAddress}`,
            },
          });

          await this.matchDepositToOrder(txHash, fromAddress, amount);
          totalDeposits++;
        }
      }

      await prisma.systemConfig.upsert({
        where: { key: 'lastTronCheckTimestamp' },
        update: { value: Date.now().toString() },
        create: { key: 'lastTronCheckTimestamp', value: Date.now().toString() },
      });
    } catch (error: any) {
      logger.error('Failed to check hot wallet deposits:', error.message);
    }

    // ── 2. Check each user's personal deposit address ─────────────────────────
    try {
      const usersWithAddresses = await prisma.user.findMany({
        where: { depositAddress: { not: null }, isActive: true },
        select: { id: true, depositAddress: true },
      });

      for (const user of usersWithAddresses) {
        if (!user.depositAddress) continue;
        try {
          const deposits = await this.checkUserAddress(user.depositAddress, user.id);
          totalDeposits += deposits;
        } catch (err: any) {
          logger.error(`Failed to check address for user ${user.id}: ${err.message}`);
        }
      }
    } catch (error: any) {
      logger.error('Failed to enumerate user deposit addresses:', error.message);
    }

    // ── 3. Retry any pending sweeps (queued from current or previous cycles) ──
    try {
      const pendingSweeps = await prisma.systemConfig.findMany({
        where: { key: { startsWith: 'pendingSweep_' } },
      });

      for (const entry of pendingSweeps) {
        const userId = entry.key.replace('pendingSweep_', '');
        const result = await this.sweepUserDeposit(userId);
        if (result.success) {
          logger.info(`Swept ${result.sweptAmount} USDT from user ${userId} to hot wallet (tx: ${result.txHash})`);
          await prisma.systemConfig.delete({ where: { key: entry.key } });
        } else {
          logger.warn(`Sweep pending for user ${userId}: ${result.error} — will retry next cycle`);
        }
      }
    } catch (error: any) {
      logger.error('Failed to process pending sweeps:', error.message);
    }

    // ── 4. Periodic balance scan: find deposit addresses still holding USDT ──
    // Runs every 10 minutes to catch any deposits that slipped through (e.g.
    // deposited before queue code was deployed, or missed due to API errors).
    try {
      const lastScan = await prisma.systemConfig.findUnique({ where: { key: 'lastBalanceScanTimestamp' } });
      const sinceLastScan = lastScan ? Date.now() - parseInt(lastScan.value) : Infinity;

      if (sinceLastScan > 10 * 60 * 1000) {
        await prisma.systemConfig.upsert({
          where: { key: 'lastBalanceScanTimestamp' },
          update: { value: Date.now().toString() },
          create: { key: 'lastBalanceScanTimestamp', value: Date.now().toString() },
        });

        const usersWithAddresses = await prisma.user.findMany({
          where: { depositAddress: { not: null }, isActive: true },
          select: { id: true, depositAddress: true },
        });

        for (const user of usersWithAddresses) {
          if (!user.depositAddress) continue;
          try {
            const balance = await this.getUsdtBalanceOf(user.depositAddress);
            if (balance >= 0.5) {
              logger.info(`Balance scan: found ${balance} USDT at user ${user.id} deposit address — queuing sweep`);
              await prisma.systemConfig.upsert({
                where: { key: `pendingSweep_${user.id}` },
                update: { value: 'true' },
                create: { key: `pendingSweep_${user.id}`, value: 'true' },
              });
            }
          } catch (err: any) {
            logger.error(`Balance scan failed for user ${user.id}: ${err.message}`);
          }
        }
      }
    } catch (error: any) {
      logger.error('Failed to run balance scan:', error.message);
    }

    if (totalDeposits > 0) {
      logger.info(`Processed ${totalDeposits} new USDT deposits total`);
    }

    return totalDeposits;
  }

  /**
   * Check a single user deposit address for new incoming USDT transfers.
   */
  private async checkUserAddress(address: string, userId: string): Promise<number> {
    const configKey = `lastCheck_${address}`;

    const lastCheck = await prisma.systemConfig.findUnique({ where: { key: configKey } });
    const sinceTimestamp = lastCheck
      ? parseInt(lastCheck.value)
      : Date.now() - 86400000; // default: last 24 hours

    const transfers = await this.fetchIncomingUsdt(address, sinceTimestamp);

    await prisma.systemConfig.upsert({
      where: { key: configKey },
      update: { value: Date.now().toString() },
      create: { key: configKey, value: Date.now().toString() },
    });

    let newDeposits = 0;
    for (const transfer of transfers) {
      const { txHash, from: fromAddress, amount } = transfer;
      const existing = await prisma.cryptoTransaction.findUnique({ where: { txHash } });

      if (!existing && amount > 0) {
        logger.info(`New USDT deposit at user address ${address}: ${amount} USDT from ${fromAddress}`);

        await prisma.cryptoTransaction.create({
          data: {
            type: 'DEPOSIT',
            status: 'CONFIRMED',
            currency: 'USDT',
            network: 'TRON',
            txHash,
            fromAddress,
            toAddress: address,
            amount,
            confirmations: 19,
            confirmedAt: new Date(transfer.blockTimestamp),
            notes: `Deposit to user personal wallet from ${fromAddress}`,
          },
        });

        await this.creditUserDeposit(userId, txHash, fromAddress, amount);
        newDeposits++;

        // Queue a sweep — will be retried each poll cycle until it succeeds
        await prisma.systemConfig.upsert({
          where: { key: `pendingSweep_${userId}` },
          update: { value: 'true' },
          create: { key: `pendingSweep_${userId}`, value: 'true' },
        });
      }
    }

    return newDeposits;
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
    // Use tight tolerance (0.001 USDT) for exact amount matching - unique amounts ensure security
    const pendingDeposit = await prisma.pendingUsdtDeposit.findFirst({
      where: {
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        // Match by exact amount (within 0.001 USDT for floating point precision)
        expectedAmount: {
          gte: amount - 0.001,
          lte: amount + 0.001,
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
   * Generate a unique deposit amount by adding random decimals
   * This ensures each deposit can be uniquely identified
   */
  private generateUniqueAmount(baseAmount: number): number {
    // Add random 4 decimal places (0.0001 to 0.0999)
    const randomDecimals = Math.floor(Math.random() * 999) + 1;
    const uniqueAmount = baseAmount + (randomDecimals / 10000);
    return Math.round(uniqueAmount * 10000) / 10000; // Round to 4 decimals
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

    // Generate unique amount with random decimals for secure matching
    let uniqueAmount = this.generateUniqueAmount(expectedAmount);

    // Ensure this exact amount isn't already pending (very unlikely but check anyway)
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.pendingUsdtDeposit.findFirst({
        where: {
          expectedAmount: uniqueAmount,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      });
      if (!existing) break;
      uniqueAmount = this.generateUniqueAmount(expectedAmount);
      attempts++;
    }

    const estimatedKes = uniqueAmount * exchangeRate;

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
        expectedAmount: uniqueAmount,
        exchangeRate,
        kesAmount: estimatedKes,
        expiresAt,
      },
    });

    logger.info(`Created deposit intent for user ${userId}: ${uniqueAmount} USDT (unique amount), expected KES ${estimatedKes.toFixed(2)}`);

    // Return user's personal deposit address (or hot wallet if mnemonic not configured)
    const depositAddress = await this.getOrCreateUserDepositAddress(userId);

    return {
      id: intent.id,
      expectedAmount: uniqueAmount,
      expiresAt,
      depositAddress,
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
   * Verify a USDT deposit transaction and credit user's balance
   * User submits their transaction hash for verification
   */
  async verifyAndCreditDeposit(
    userId: string,
    txHash: string
  ): Promise<{ success: boolean; amount?: number; kesAmount?: number; error?: string }> {
    const tronWeb = this.getTronWeb();
    const hotWallet = this.getHotWalletAddress();

    try {
      // 1. Check if this transaction was already processed
      const existingTx = await prisma.cryptoTransaction.findUnique({
        where: { txHash },
      });

      if (existingTx) {
        if (existingTx.status === 'COMPLETED') {
          return { success: false, error: 'This transaction has already been credited' };
        }
        // If pending, continue to verify
      }

      // 2. Check if this txHash was already claimed by another user
      const existingClaim = await prisma.balanceTransaction.findFirst({
        where: { txHash },
      });

      if (existingClaim) {
        return { success: false, error: 'This transaction has already been claimed' };
      }

      // 3. Fetch transaction info from TRON blockchain
      logger.info(`Verifying transaction ${txHash} for user ${userId}`);

      const txInfo = await tronWeb.trx.getTransactionInfo(txHash);

      if (!txInfo || !txInfo.id) {
        return { success: false, error: 'Transaction not found on blockchain. Please wait a few minutes and try again.' };
      }

      // 4. Check if transaction was successful
      if (txInfo.receipt?.result !== 'SUCCESS') {
        return { success: false, error: 'Transaction failed on blockchain' };
      }

      // 5. Parse the TRC-20 transfer event logs
      const logs = txInfo.log || [];
      let transferAmount = 0;
      let toAddress = '';
      let fromAddress = '';
      let contractAddress = '';

      logger.info(`Transaction ${txHash} has ${logs.length} logs`);

      for (const log of logs) {
        // Transfer event topic: keccak256("Transfer(address,address,uint256)")
        if (log.topics && log.topics[0] === 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          // Decode from address (topic[1])
          fromAddress = tronWeb.address.fromHex('41' + log.topics[1].slice(24));
          // Decode to address (topic[2])
          toAddress = tronWeb.address.fromHex('41' + log.topics[2].slice(24));
          // Decode amount from data (6 decimals for USDT)
          transferAmount = parseInt(log.data, 16) / 1_000_000;
          // Get contract address from log (more reliable than txInfo.contract_address)
          contractAddress = tronWeb.address.fromHex('41' + log.address);

          logger.info(`Parsed Transfer: ${transferAmount} from ${fromAddress} to ${toAddress}, contract: ${contractAddress}`);
        }
      }

      if (transferAmount === 0) {
        return { success: false, error: 'Could not parse USDT transfer from transaction' };
      }

      // 6. Verify the transfer was TO either the hot wallet OR the user's personal deposit address
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { depositAddress: true },
      });
      const validAddresses = [hotWallet.toLowerCase()];
      if (userRecord?.depositAddress) {
        validAddresses.push(userRecord.depositAddress.toLowerCase());
      }
      if (!validAddresses.includes(toAddress.toLowerCase())) {
        return { success: false, error: `This transaction was not sent to your deposit address` };
      }

      // 7. Verify it's the USDT contract (using contract address from log)
      logger.info(`Checking contract: got ${contractAddress}, expected ${this.usdtContract}`);
      if (contractAddress.toLowerCase() !== this.usdtContract.toLowerCase()) {
        return { success: false, error: 'This is not a USDT transaction' };
      }

      // 8. Get exchange rate and calculate KES
      const rate = await prisma.exchangeRate.findFirst({
        where: { pair: 'USDT_KES', isActive: true },
      });

      if (!rate) {
        return { success: false, error: 'Exchange rate not available' };
      }

      const exchangeRate = Number(rate.buyRate);
      const kesAmount = transferAmount * exchangeRate;

      // 9. Credit user's USDT balance (atomic transaction)
      await prisma.$transaction(async (tx) => {
        // Get or create user balance
        let userBalance = await tx.userBalance.findUnique({
          where: { userId },
        });

        if (!userBalance) {
          userBalance = await tx.userBalance.create({
            data: {
              userId,
              balance: 0,
              usdtBalance: 0,
              currency: 'KES',
            },
          });
        }

        const currentUsdtBalance = Number(userBalance.usdtBalance);
        const newUsdtBalance = currentUsdtBalance + transferAmount;

        // Credit USDT balance (not KES)
        await tx.userBalance.update({
          where: { userId },
          data: { usdtBalance: newUsdtBalance },
        });

        // Create balance transaction record
        await tx.balanceTransaction.create({
          data: {
            userBalanceId: userBalance.id,
            type: 'USDT_DEPOSIT',
            status: 'COMPLETED',
            currency: 'USDT',
            amount: transferAmount,
            usdtAmount: transferAmount,
            balanceBefore: currentUsdtBalance,
            balanceAfter: newUsdtBalance,
            txHash,
            walletAddress: fromAddress,
            reference: txHash,
            description: `USDT deposit: ${transferAmount} USDT (≈ KES ${kesAmount.toFixed(2)} @ ${exchangeRate})`,
            completedAt: new Date(),
          },
        });

        // Record crypto transaction
        await tx.cryptoTransaction.upsert({
          where: { txHash },
          update: {
            status: 'COMPLETED',
            confirmedAt: new Date(),
          },
          create: {
            type: 'DEPOSIT',
            status: 'COMPLETED',
            currency: 'USDT',
            network: 'TRON',
            txHash,
            fromAddress,
            toAddress,
            amount: transferAmount,
            blockNumber: BigInt(txInfo.blockNumber),
            confirmations: 19,
            confirmedAt: new Date(),
            notes: `Verified deposit: ${transferAmount} USDT from ${fromAddress}`,
          },
        });
      });

      logger.info(`Successfully credited ${transferAmount} USDT to user ${userId} (tx: ${txHash})`);

      // Send Telegram notification
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const userBalance = await prisma.userBalance.findUnique({ where: { userId } });
        telegramService.notifyDeposit({
          email: user.email,
          usdtAmount: transferAmount,
          txHash,
          newBalance: Number(userBalance?.usdtBalance || 0),
        }).catch(console.error);
      }

      return {
        success: true,
        amount: transferAmount,
        kesAmount,
      };
    } catch (error: any) {
      logger.error(`Failed to verify deposit ${txHash}:`, error.message);
      return { success: false, error: error.message || 'Failed to verify transaction' };
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
      data: transactions.map(tx => ({
        ...tx,
        blockNumber: tx.blockNumber != null ? tx.blockNumber.toString() : null,
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
   * Get wallet summary
   */
  async getWalletSummary() {
    try {
      // Use individual try-catches so one failing on-chain call doesn't kill the whole summary
      const [trxBalance, usdtBalance] = await Promise.all([
        this.getTrxBalance().catch(() => 0),
        this.getUsdtBalance().catch(() => 0),
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
      // Return a partial summary rather than throwing — the admin page must always load
      return {
        hotWallet: config.tron.hotWalletAddress || 'Not configured',
        network: config.tron.network,
        balances: { trx: 0, usdt: 0 },
        today: { deposits: { count: 0, amount: 0 }, withdrawals: { count: 0, amount: 0 } },
        error: error.message,
      };
    }
  }

  /**
   * Send TRX — raw secp256k1 signing via TronGrid REST API. No TronWeb.
   */
  private async sendTrxDirect(
    fromAddress: string,
    toAddress: string,
    amountSun: number,
    privateKey: string
  ): Promise<string> {
    logger.info(`sendTrxDirect: from=${fromAddress}, to=${toAddress}, amount=${amountSun} sun`);
    const txID = await sendTrxRaw(fromAddress, toAddress, amountSun, privateKey, this.baseUrl, config.tron.apiKey);
    logger.info(`TRX sent. txID=${txID}`);
    return txID;
  }

  /**
   * Send USDT TRC-20 — raw secp256k1 signing via TronGrid REST API. No TronWeb.
   */
  private async sendUsdtDirect(
    fromAddress: string,
    toAddress: string,
    amountSun: number,
    privateKey: string
  ): Promise<string> {
    logger.info(`sendUsdtDirect: from=${fromAddress}, to=${toAddress}, amount=${amountSun} sun`);
    const txID = await sendUsdtRaw(fromAddress, toAddress, amountSun, privateKey, this.usdtContract, this.baseUrl, config.tron.apiKey);
    logger.info(`USDT sent. txID=${txID}`);
    return txID;
  }

  /**
   * Sweep USDT from a user's personal deposit address to the hot wallet.
   * Requires TRON_MNEMONIC to derive the user's private key.
   * Uses raw secp256k1 signing — no TronWeb key validation involved.
   */
  async sweepUserDeposit(userId: string): Promise<{ success: boolean; txHash?: string; sweptAmount?: number; error?: string }> {
    if (!config.tron.mnemonic) {
      return { success: false, error: 'TRON_MNEMONIC not configured' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { depositAddress: true, walletIndex: true },
    });

    if (!user?.depositAddress || user.walletIndex === null || user.walletIndex === undefined) {
      return { success: false, error: 'User does not have a personal deposit address' };
    }

    const usdtBalance = await this.getUsdtBalanceOf(user.depositAddress);
    if (usdtBalance < 0.1) {
      return { success: false, error: `Nothing to sweep: ${usdtBalance} USDT at deposit address` };
    }

    const hotWalletPk = config.tron.privateKey;
    if (!hotWalletPk) return { success: false, error: 'TRON_PRIVATE_KEY not configured' };

    const hotWallet = this.getHotWalletAddress();

    // ── Ensure deposit address has enough TRX for energy (USDT transfer costs ~14 TRX) ──
    const TRX_FOR_ENERGY = 15;
    try {
      const tronWeb = this.getTronWeb();
      const resources = await tronWeb.trx.getAccountResources(user.depositAddress);
      const availableEnergy = (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0);
      const { trx: trxBalance } = await this.fetchAccountData(user.depositAddress);

      logger.info(`Deposit address ${user.depositAddress}: energy=${availableEnergy}, trx=${trxBalance}`);

      if (availableEnergy < 14_895 && trxBalance < TRX_FOR_ENERGY) {
        const trxNeeded = TRX_FOR_ENERGY - trxBalance;
        const { trx: hotTrx } = await this.fetchAccountData(hotWallet);
        if (hotTrx < trxNeeded + 1) {
          return { success: false, error: `Hot wallet only has ${hotTrx.toFixed(2)} TRX — need ${(trxNeeded + 1).toFixed(0)} TRX to fund sweep` };
        }
        logger.info(`Sending ${trxNeeded} TRX from hot wallet to ${user.depositAddress} for energy`);
        await this.sendTrxDirect(hotWallet, user.depositAddress, Math.floor(trxNeeded * 1_000_000), hotWalletPk);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (energyErr: any) {
      logger.warn(`Energy check failed, proceeding anyway: ${energyErr.message}`);
    }

    // ── Sweep USDT from deposit address to hot wallet ──
    const { privateKey: depositPk } = this.deriveWallet(user.walletIndex);
    const amountInSun = Math.floor(usdtBalance * 1_000_000);

    try {
      const txHash = await this.sendUsdtDirect(user.depositAddress, hotWallet, amountInSun, depositPk);

      logger.info(`Swept ${usdtBalance} USDT from user ${userId} deposit address to hot wallet. TX: ${txHash}`);

      await prisma.cryptoTransaction.create({
        data: {
          type: 'DEPOSIT',
          status: 'PENDING',
          currency: 'USDT',
          network: 'TRON',
          txHash,
          fromAddress: user.depositAddress,
          toAddress: hotWallet,
          amount: usdtBalance,
          notes: `Sweep from user ${userId} personal deposit address`,
        },
      });

      return { success: true, txHash, sweptAmount: usdtBalance };
    } catch (error: any) {
      logger.error(`Failed to sweep user ${userId} deposit address: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export const tronService = new TronService();
