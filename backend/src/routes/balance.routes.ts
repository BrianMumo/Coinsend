import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validator';
import { asyncHandler } from '../middleware/errorHandler';
import { balanceService } from '../services/balance.service';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const depositValidation = [
  body('amount')
    .isFloat({ min: 10, max: 150000 })
    .withMessage('Amount must be between KES 10 and KES 150,000'),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any')
    .withMessage('Valid phone number required'),
];

const withdrawValidation = [
  body('amount')
    .isFloat({ min: 10, max: 70000 })
    .withMessage('Amount must be between KES 10 and KES 70,000'),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any')
    .withMessage('Valid phone number required'),
];

const transactionQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['DEPOSIT', 'WITHDRAWAL', 'ORDER_PAYMENT', 'ORDER_REFUND', 'ADJUSTMENT', 'USDT_DEPOSIT', 'USDT_WITHDRAWAL']).withMessage('Invalid transaction type'),
  query('status').optional().isIn(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).withMessage('Invalid status'),
];

const usdtWithdrawValidation = [
  body('amount')
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Amount must be between 1 and 10,000 USDT'),
  body('walletAddress')
    .notEmpty()
    .withMessage('Wallet address is required')
    .isLength({ min: 30, max: 50 })
    .withMessage('Invalid TRON wallet address'),
];

/**
 * GET /api/balance
 * Get user's balance and recent transactions
 */
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await balanceService.getBalanceWithHistory(req.user!.userId, {
      page,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/balance/transactions
 * Get transaction history with filters
 */
router.get(
  '/transactions',
  validate(transactionQueryValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as any;
    const status = req.query.status as any;

    const result = await balanceService.getTransactionHistory(req.user!.userId, {
      page,
      limit,
      type,
      status,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * POST /api/balance/deposit
 * Initiate M-Pesa deposit to balance
 */
router.post(
  '/deposit',
  validate(depositValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, phoneNumber } = req.body;

    logger.info(`Deposit request from user ${req.user!.userId}: Amount ${amount}, Phone ${phoneNumber}`);

    const result = await balanceService.initiateDeposit(
      req.user!.userId,
      parseFloat(amount),
      phoneNumber
    );

    res.json({
      success: true,
      message: 'Check your phone for M-Pesa prompt',
      data: {
        transactionId: result.transaction.id,
        amount: result.transaction.amount,
        checkoutRequestId: result.stkResponse.CheckoutRequestID,
        merchantRequestId: result.stkResponse.MerchantRequestID,
      },
    });
  })
);

/**
 * POST /api/balance/withdraw
 * Initiate withdrawal to M-Pesa
 */
router.post(
  '/withdraw',
  validate(withdrawValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, phoneNumber } = req.body;

    logger.info(`Withdrawal request from user ${req.user!.userId}: Amount ${amount}, Phone ${phoneNumber}`);

    const result = await balanceService.initiateWithdrawal(
      req.user!.userId,
      parseFloat(amount),
      phoneNumber
    );

    res.json({
      success: true,
      message: 'Withdrawal initiated. You will receive the funds shortly.',
      data: {
        transactionId: result.transaction.id,
        amount: result.transaction.amount,
      },
    });
  })
);

/**
 * GET /api/balance/deposit/:transactionId/status
 * Check deposit transaction status
 */
router.get(
  '/deposit/:transactionId/status',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { transactionId } = req.params;

    const result = await balanceService.checkDepositStatus(transactionId, req.user!.userId);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/balance/withdraw/:transactionId/status
 * Check withdrawal transaction status
 */
router.get(
  '/withdraw/:transactionId/status',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { transactionId } = req.params;

    // Reuse the same method - it works for any transaction type
    const result = await balanceService.checkDepositStatus(transactionId, req.user!.userId);

    res.json({
      success: true,
      data: result,
    });
  })
);

// ============ USDT ROUTES ============

/**
 * GET /api/balance/usdt
 * Get USDT balance and deposit address
 */
router.get(
  '/usdt',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const balance = await balanceService.getOrCreateBalance(req.user!.userId);

    res.json({
      success: true,
      data: {
        usdtBalance: balance.usdtBalance.toString(),
        depositAddress: balanceService.getUsdtDepositAddress(),
        network: 'TRON (TRC-20)',
      },
    });
  })
);

/**
 * GET /api/balance/usdt/transactions
 * Get USDT transaction history
 */
router.get(
  '/usdt/transactions',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await balanceService.getUsdtTransactions(req.user!.userId, {
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * POST /api/balance/usdt/withdraw
 * Withdraw USDT to external wallet
 */
router.post(
  '/usdt/withdraw',
  validate(usdtWithdrawValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, walletAddress } = req.body;

    logger.info(`USDT withdrawal request from user ${req.user!.userId}: Amount ${amount}, Address ${walletAddress}`);

    const result = await balanceService.withdrawUsdt(
      req.user!.userId,
      parseFloat(amount),
      walletAddress
    );

    res.json({
      success: true,
      message: 'USDT withdrawal processed successfully',
      data: {
        transactionId: result.transaction.id,
        amount: result.transaction.amount,
        txHash: result.txHash,
        status: result.transaction.status,
      },
    });
  })
);

export default router;
