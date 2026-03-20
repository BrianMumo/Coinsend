import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validator';
import { asyncHandler } from '../middleware/errorHandler';
import { balanceService } from '../services/balance.service';
import { tronService } from '../services/tron.service';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const depositValidation = [
  body('amount')
    .isFloat({ min: 10, max: 250000 })
    .withMessage('Amount must be between KES 10 and KES 250,000'),
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
  query('type').optional().isIn(['DEPOSIT', 'WITHDRAWAL', 'ORDER_PAYMENT', 'ORDER_REFUND', 'ADJUSTMENT', 'USDT_DEPOSIT', 'USDT_WITHDRAWAL', 'KES_WITHDRAWAL']).withMessage('Invalid transaction type'),
  query('status').optional().isIn(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).withMessage('Invalid status'),
];

const kesWithdrawValidation = [
  body('amount')
    .isFloat({ min: 0.5, max: 2000 })
    .withMessage('Amount must be between 0.5 and 2,000 USDT'),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any')
    .withMessage('Valid phone number required'),
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

const usdtDepositIntentValidation = [
  body('amount')
    .isFloat({ min: 1, max: 100000 })
    .withMessage('Amount must be between 1 and 100,000 USDT'),
];

const verifyDepositValidation = [
  body('txHash')
    .notEmpty()
    .withMessage('Transaction hash is required')
    .isLength({ min: 64, max: 66 })
    .withMessage('Invalid transaction hash format'),
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

/**
 * POST /api/balance/withdraw-kes
 * Withdraw USDT as KES to M-Pesa (converts at current rate)
 */
router.post(
  '/withdraw-kes',
  validate(kesWithdrawValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, phoneNumber } = req.body;

    logger.info(`KES withdrawal request from user ${req.user!.userId}: ${amount} USDT, Phone ${phoneNumber}`);

    const result = await balanceService.withdrawToKes(
      req.user!.userId,
      parseFloat(amount),
      phoneNumber
    );

    res.json({
      success: true,
      message: `Sending KES ${result.kesAmount.toLocaleString()} to ${phoneNumber}`,
      data: {
        transactionId: result.transaction.id,
        usdtAmount: result.transaction.usdtAmount,
        kesAmount: result.kesAmount.toString(),
        rate: result.rate,
        status: result.transaction.status,
      },
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

/**
 * POST /api/balance/usdt/deposit-intent
 * Create a deposit intent (user declares they're sending X USDT)
 * This helps match incoming deposits to users
 */
router.post(
  '/usdt/deposit-intent',
  validate(usdtDepositIntentValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount } = req.body;

    logger.info(`USDT deposit intent from user ${req.user!.userId}: Amount ${amount}`);

    const result = await tronService.createDepositIntent(
      req.user!.userId,
      parseFloat(amount)
    );

    res.json({
      success: true,
      message: 'Deposit intent created. Send USDT to the address below.',
      data: {
        intentId: result.id,
        expectedAmount: result.expectedAmount,
        depositAddress: result.depositAddress,
        network: 'TRON (TRC-20)',
        exchangeRate: result.exchangeRate,
        estimatedKes: result.estimatedKes,
        expiresAt: result.expiresAt,
        expiresIn: '1 hour',
      },
    });
  })
);

/**
 * GET /api/balance/usdt/deposit-intent
 * Get user's active pending deposit intent
 */
router.get(
  '/usdt/deposit-intent',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const intent = await tronService.getPendingDepositIntent(req.user!.userId);

    if (!intent) {
      res.json({
        success: true,
        data: null,
        message: 'No pending deposit intent',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: intent.id,
        expectedAmount: intent.expectedAmount,
        estimatedKes: intent.kesAmount,
        exchangeRate: intent.exchangeRate,
        depositAddress: tronService.getHotWalletAddress(),
        network: 'TRON (TRC-20)',
        expiresAt: intent.expiresAt,
        createdAt: intent.createdAt,
      },
    });
  })
);

/**
 * POST /api/balance/usdt/verify-deposit
 * User submits their transaction hash to verify and credit their deposit
 * This is the PRIMARY method for crediting USDT deposits
 */
router.post(
  '/usdt/verify-deposit',
  validate(verifyDepositValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { txHash } = req.body;

    logger.info(`Deposit verification request from user ${req.user!.userId}: txHash ${txHash}`);

    const result = await tronService.verifyAndCreditDeposit(
      req.user!.userId,
      txHash.trim()
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { message: result.error },
      });
      return;
    }

    res.json({
      success: true,
      message: `Successfully credited ${result.kesAmount?.toFixed(2)} KES from ${result.amount} USDT deposit`,
      data: {
        usdtAmount: result.amount,
        kesAmount: result.kesAmount,
        txHash,
      },
    });
  })
);

export default router;
