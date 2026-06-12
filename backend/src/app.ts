import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';

// Allow BigInt values to be serialized to JSON (Prisma returns BigInt for blockNumber)
(BigInt.prototype as any).toJSON = function () { return this.toString(); };
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import orderRoutes from './routes/order.routes';
import rateRoutes from './routes/rate.routes';
import adminRoutes from './routes/admin.routes';
import mpesaRoutes from './routes/mpesa.routes';
import paymentsRoutes from './routes/payments.routes';
import balanceRoutes from './routes/balance.routes';

const app = express();

// Trust proxy - required for Railway/cloud deployments behind reverse proxy
// This fixes express-rate-limit X-Forwarded-For header validation
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = config.frontendUrl.split(',').map(url => url.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      logger.warn(`CORS blocked origin: ${origin}, allowed: ${allowedOrigins.join(', ')}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/balance', balanceRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
