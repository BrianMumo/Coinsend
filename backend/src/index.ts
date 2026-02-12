import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { depositMonitor } from './services/depositMonitor.service';

const prisma = new PrismaClient();

// Auto-seed essential data if missing
async function seedEssentialData() {
  // Check if rates exist
  const ratesCount = await prisma.exchangeRate.count();
  if (ratesCount === 0) {
    logger.info('No exchange rates found, seeding default rates...');

    const rates = [
      { pair: 'USDT_KES', buyRate: 132, sellRate: 130, midRate: 131, spread: 0.015 },
    ];

    for (const rate of rates) {
      await prisma.exchangeRate.create({
        data: {
          pair: rate.pair,
          buyRate: rate.buyRate,
          sellRate: rate.sellRate,
          midRate: rate.midRate,
          spread: rate.spread,
          minAmount: 1,
          maxAmount: 100000,
          isActive: true,
        },
      });
    }
    logger.info('Default exchange rates seeded successfully');
  }
}

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Seed essential data if missing
    await seedEssentialData();

    // Start deposit monitor for automatic USDT detection
    depositMonitor.start();

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Frontend URL: ${config.frontendUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  depositMonitor.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  depositMonitor.stop();
  await prisma.$disconnect();
  process.exit(0);
});

main();
