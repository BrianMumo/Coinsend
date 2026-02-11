import { tronService } from './tron.service';
import { logger } from '../utils/logger';
import { config } from '../config/env';

class DepositMonitorService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval = 30000; // 30 seconds

  /**
   * Start the deposit monitoring background job
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Deposit monitor is already running');
      return;
    }

    // Check if TRON is configured
    if (!config.tron.apiKey) {
      logger.warn('TRON API key not configured, deposit monitor disabled');
      return;
    }

    this.isRunning = true;
    logger.info(`Starting deposit monitor (polling every ${this.pollInterval / 1000}s)`);

    // Run immediately on start
    this.checkDeposits();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.checkDeposits();
    }, this.pollInterval);
  }

  /**
   * Stop the deposit monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info('Deposit monitor stopped');
  }

  /**
   * Check for new deposits
   */
  private async checkDeposits(): Promise<void> {
    try {
      // Check for new USDT deposits
      const newDeposits = await tronService.checkNewDeposits();

      if (newDeposits > 0) {
        logger.info(`Processed ${newDeposits} new USDT deposits`);
      }

      // Clean up expired deposit intents
      await tronService.cleanupExpiredIntents();
    } catch (error: any) {
      logger.error('Deposit monitor error:', error.message);
    }
  }

  /**
   * Manually trigger a deposit check
   */
  async manualCheck(): Promise<number> {
    logger.info('Manual deposit check triggered');
    try {
      const newDeposits = await tronService.checkNewDeposits();
      await tronService.cleanupExpiredIntents();
      return newDeposits;
    } catch (error: any) {
      logger.error('Manual deposit check failed:', error.message);
      throw error;
    }
  }

  /**
   * Get monitor status
   */
  getStatus(): { isRunning: boolean; pollInterval: number } {
    return {
      isRunning: this.isRunning,
      pollInterval: this.pollInterval,
    };
  }
}

export const depositMonitor = new DepositMonitorService();
