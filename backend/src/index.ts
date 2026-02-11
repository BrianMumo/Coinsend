import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { depositMonitor } from './services/depositMonitor.service';

const prisma = new PrismaClient();

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

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
