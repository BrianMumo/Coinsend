import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { adminService } from '../services/admin.service';
import { rateService } from '../services/rate.service';
import { mpesaService } from '../services/mpesa.service';
import { tronService } from '../services/tron.service';
import { authenticateAdmin, AdminRequest, requireRole } from '../middleware/adminAuth.middleware';
import { validate } from '../middleware/validator';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimiter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateOrderStatusValidation = [
  body('status')
    .isIn(['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])
    .withMessage('Invalid status'),
  body('processingNotes').optional().trim(),
  body('payoutReference').optional().trim(),
];

const updateRateValidation = [
  body('buyRate').optional().isFloat({ min: 0 }).withMessage('Buy rate must be a positive number'),
  body('sellRate').optional().isFloat({ min: 0 }).withMessage('Sell rate must be a positive number'),
  body('isActive').optional().isBoolean(),
];

const createRateValidation = [
  body('pair').notEmpty().withMessage('Pair is required (e.g., USDT_KES)'),
  body('buyRate').isFloat({ min: 0 }).withMessage('Buy rate is required'),
  body('sellRate').isFloat({ min: 0 }).withMessage('Sell rate is required'),
  body('minAmount').optional().isFloat({ min: 0 }),
  body('maxAmount').optional().isFloat({ min: 0 }),
];

const updateLiquidityValidation = [
  body('balance').isFloat({ min: 0 }).withMessage('Balance must be a positive number'),
  body('notes').optional().trim(),
];

const createWalletValidation = [
  body('currency').isIn(['USDT', 'USDC', 'BTC', 'ETH']).withMessage('Invalid currency'),
  body('network').isIn(['TRON', 'ETHEREUM', 'BSC', 'POLYGON', 'BITCOIN']).withMessage('Invalid network'),
  body('address').notEmpty().withMessage('Wallet address is required'),
  body('label').optional().trim(),
];

// Public routes
router.post(
  '/login',
  authLimiter,
  validate(loginValidation),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const result = await adminService.login(req.body);
    res.json({
      success: true,
      data: result,
      message: 'Admin login successful',
    });
  })
);

// Protected routes - require admin authentication
router.use(authenticateAdmin);

// Get current admin
router.get(
  '/me',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const admin = await adminService.getCurrentAdmin(req.admin!.adminId);
    res.json({
      success: true,
      data: { admin },
    });
  })
);

// Dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const stats = await adminService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  })
);

// Orders
router.get(
  '/orders',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { page, limit, sortBy, sortOrder, status, orderType, search } = req.query;

    const result = await adminService.getAllOrders({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      status: status as any,
      orderType: orderType as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

router.put(
  '/orders/:id/status',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(updateOrderStatusValidation),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const order = await adminService.updateOrderStatus(
      req.params.id,
      req.body,
      req.admin!.adminId
    );
    res.json({
      success: true,
      data: { order },
      message: 'Order status updated successfully',
    });
  })
);

// Users
router.get(
  '/users',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { page, limit, sortBy, sortOrder, kycStatus, search } = req.query;

    const result = await adminService.getAllUsers({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      kycStatus: kycStatus as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

router.get(
  '/users/:id',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const user = await adminService.getUserById(req.params.id);
    res.json({
      success: true,
      data: { user },
    });
  })
);

// Suspend/Unsuspend User
router.put(
  '/users/:id/status',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate([
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
    body('reason').optional().trim(),
  ]),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.adminId,
        action: isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
        entityType: 'User',
        entityId: id,
        details: { reason, previousStatus: user.isActive },
      },
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
      data: { user: updatedUser },
    });
  })
);

// Update User KYC Status
router.put(
  '/users/:id/kyc',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate([
    body('kycStatus').isIn(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']).withMessage('Invalid KYC status'),
    body('notes').optional().trim(),
  ]),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { id } = req.params;
    const { kycStatus, notes } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { kycStatus },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kycStatus: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.adminId,
        action: 'USER_KYC_UPDATE',
        entityType: 'User',
        entityId: id,
        details: { newStatus: kycStatus, previousStatus: user.kycStatus, notes },
      },
    });

    res.json({
      success: true,
      message: `User KYC status updated to ${kycStatus}`,
      data: { user: updatedUser },
    });
  })
);

// Get recent USDT deposits
router.get(
  '/deposits/usdt',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [deposits, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where: { type: 'USDT_DEPOSIT' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          userBalance: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true, phone: true },
              },
            },
          },
        },
      }),
      prisma.balanceTransaction.count({ where: { type: 'USDT_DEPOSIT' } }),
    ]);

    res.json({
      success: true,
      data: deposits.map(d => ({
        id: d.id,
        userId: d.userBalance.user.id,
        userEmail: d.userBalance.user.email,
        userName: `${d.userBalance.user.firstName || ''} ${d.userBalance.user.lastName || ''}`.trim(),
        amount: d.amount,
        txHash: d.txHash,
        status: d.status,
        createdAt: d.createdAt,
        completedAt: d.completedAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// KES Withdrawals (conversions from USDT)
router.get(
  '/withdrawals/kes',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { type: 'KES_WITHDRAWAL' };
    if (status) where.status = status;

    const [withdrawals, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          userBalance: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true, phone: true },
              },
            },
          },
        },
      }),
      prisma.balanceTransaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: withdrawals.map(w => ({
        id: w.id,
        userId: w.userBalance.user.id,
        userEmail: w.userBalance.user.email,
        userName: `${w.userBalance.user.firstName || ''} ${w.userBalance.user.lastName || ''}`.trim(),
        userPhone: w.userBalance.user.phone,
        usdtAmount: Math.abs(Number(w.amount)).toString(),
        phoneNumber: w.phoneNumber,
        description: w.description,
        status: w.status,
        reference: w.reference,
        createdAt: w.createdAt,
        completedAt: w.completedAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Complete KES withdrawal manually (if B2C callback fails)
router.put(
  '/withdrawals/:id/complete',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate([
    body('mpesaReceiptNumber').optional().trim(),
  ]),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { id } = req.params;
    const { mpesaReceiptNumber } = req.body;

    const withdrawal = await prisma.balanceTransaction.findFirst({
      where: { id, type: 'KES_WITHDRAWAL' },
    });

    if (!withdrawal) {
      throw new AppError('Withdrawal not found', 404);
    }

    if (withdrawal.status !== 'PENDING') {
      throw new AppError('Withdrawal is not pending', 400);
    }

    await prisma.balanceTransaction.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        reference: mpesaReceiptNumber || withdrawal.reference,
        description: `${withdrawal.description} - Manually completed by admin`,
        completedAt: new Date(),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.adminId,
        action: 'KES_WITHDRAWAL_COMPLETED',
        entityType: 'BalanceTransaction',
        entityId: id,
        details: { mpesaReceiptNumber },
      },
    });

    res.json({
      success: true,
      message: 'Withdrawal marked as completed',
    });
  })
);

// Reject/Cancel KES withdrawal and refund USDT
router.put(
  '/withdrawals/:id/reject',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate([
    body('reason').notEmpty().withMessage('Rejection reason is required').trim(),
  ]),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const withdrawal = await prisma.balanceTransaction.findFirst({
      where: { id, type: 'KES_WITHDRAWAL' },
      include: { userBalance: true },
    });

    if (!withdrawal) {
      throw new AppError('Withdrawal not found', 404);
    }

    if (withdrawal.status !== 'PENDING') {
      throw new AppError('Withdrawal is not pending', 400);
    }

    // Refund the USDT
    const refundAmount = Math.abs(Number(withdrawal.amount));

    await prisma.$transaction(async (tx) => {
      await tx.userBalance.update({
        where: { id: withdrawal.userBalanceId },
        data: { usdtBalance: { increment: refundAmount } },
      });

      await tx.balanceTransaction.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          description: `${withdrawal.description} - Rejected: ${reason}`,
          completedAt: new Date(),
        },
      });
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.adminId,
        action: 'KES_WITHDRAWAL_REJECTED',
        entityType: 'BalanceTransaction',
        entityId: id,
        details: { reason, refundedAmount: refundAmount },
      },
    });

    res.json({
      success: true,
      message: 'Withdrawal rejected and USDT refunded',
    });
  })
);

// ============ ADMIN USDT ADJUSTMENT ============

// Adjust user's USDT balance (for corrections)
router.post(
  '/users/:userId/adjust-usdt',
  requireRole('SUPER_ADMIN'),
  validate([
    body('amount').isFloat().withMessage('Amount is required'),
    body('reason').notEmpty().withMessage('Reason is required').trim(),
  ]),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    const adjustmentAmount = parseFloat(amount);

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get or create user balance
    let userBalance = await prisma.userBalance.findUnique({
      where: { userId },
    });

    if (!userBalance) {
      userBalance = await prisma.userBalance.create({
        data: {
          userId,
          balance: 0,
          usdtBalance: 0,
          currency: 'KES',
        },
      });
    }

    const currentUsdtBalance = Number(userBalance.usdtBalance);
    const newUsdtBalance = currentUsdtBalance + adjustmentAmount;

    if (newUsdtBalance < 0) {
      throw new AppError('Adjustment would result in negative balance', 400);
    }

    // Update balance and create transaction record
    await prisma.$transaction(async (tx) => {
      await tx.userBalance.update({
        where: { userId },
        data: { usdtBalance: newUsdtBalance },
      });

      await tx.balanceTransaction.create({
        data: {
          userBalanceId: userBalance!.id,
          type: 'ADJUSTMENT',
          status: 'COMPLETED',
          currency: 'USDT',
          amount: adjustmentAmount,
          usdtAmount: Math.abs(adjustmentAmount),
          balanceBefore: currentUsdtBalance,
          balanceAfter: newUsdtBalance,
          description: `Admin USDT adjustment: ${reason}`,
          completedAt: new Date(),
        },
      });
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.adminId,
        action: 'USDT_BALANCE_ADJUSTMENT',
        entityType: 'UserBalance',
        entityId: userBalance.id,
        details: {
          userId,
          userEmail: user.email,
          previousBalance: currentUsdtBalance,
          adjustmentAmount,
          newBalance: newUsdtBalance,
          reason,
        },
      },
    });

    res.json({
      success: true,
      message: `USDT balance adjusted by ${adjustmentAmount >= 0 ? '+' : ''}${adjustmentAmount}`,
      data: {
        userId,
        previousBalance: currentUsdtBalance,
        adjustmentAmount,
        newBalance: newUsdtBalance,
      },
    });
  })
);

// Rates
router.get(
  '/rates',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    // Admin sees ALL rates including inactive
    const rates = await rateService.getAllRatesForAdmin();
    res.json({
      success: true,
      data: { rates },
    });
  })
);

router.put(
  '/rates/:id',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(updateRateValidation),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const rate = await rateService.updateRate(
      req.params.id,
      req.body,
      req.admin!.adminId
    );
    res.json({
      success: true,
      data: { rate },
      message: 'Rate updated successfully',
    });
  })
);

router.post(
  '/rates',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(createRateValidation),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const rate = await rateService.createRate(req.body, req.admin!.adminId);
    res.status(201).json({
      success: true,
      data: { rate },
      message: 'Rate created successfully',
    });
  })
);

// Liquidity
router.get(
  '/liquidity',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const balances = await adminService.getLiquidityBalances();
    res.json({
      success: true,
      data: { balances },
    });
  })
);

router.put(
  '/liquidity/:currency',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(updateLiquidityValidation),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { balance, notes } = req.body;
    const liquidityBalance = await adminService.updateLiquidityBalance(
      req.params.currency,
      balance,
      req.admin!.adminId,
      notes
    );
    res.json({
      success: true,
      data: { balance: liquidityBalance },
      message: 'Liquidity balance updated successfully',
    });
  })
);

// Wallets
router.get(
  '/wallets',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const wallets = await adminService.getWallets();
    res.json({
      success: true,
      data: { wallets },
    });
  })
);

router.post(
  '/wallets',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(createWalletValidation),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const wallet = await adminService.createWallet(req.body);
    res.status(201).json({
      success: true,
      data: { wallet },
      message: 'Wallet added successfully',
    });
  })
);

router.put(
  '/wallets/:id',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { isActive, label } = req.body;
    const wallet = await adminService.updateWallet(req.params.id, { isActive, label });
    res.json({
      success: true,
      data: { wallet },
      message: 'Wallet updated successfully',
    });
  })
);

// ============ M-PESA ADMIN ROUTES ============

const b2cPaymentValidation = [
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('amount').isFloat({ min: 10, max: 150000 }).withMessage('Amount must be between 10 and 150,000 KES'),
  body('commandId')
    .optional()
    .isIn(['BusinessPayment', 'SalaryPayment', 'PromotionPayment'])
    .withMessage('Invalid command ID'),
  body('remarks').optional().trim().isLength({ max: 100 }),
  body('orderId').optional().isUUID(),
];

// Get M-Pesa Account Balance (cached)
router.get(
  '/mpesa/balance',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const cachedBalance = await mpesaService.getLatestBalance();
    res.json({
      success: true,
      data: cachedBalance,
    });
  })
);

// Trigger Balance Query (async - result comes via callback)
router.post(
  '/mpesa/balance/refresh',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const result = await mpesaService.queryAccountBalance();

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.adminId,
        action: 'MPESA_BALANCE_QUERY',
        entityType: 'MpesaTransaction',
        details: { conversationId: result.ConversationID },
      },
    });

    res.json({
      success: true,
      message: 'Balance query initiated. Results will be available shortly.',
      data: {
        conversationId: result.ConversationID,
      },
    });
  })
);

// Initiate B2C Payment (SUPER_ADMIN only)
router.post(
  '/mpesa/b2c',
  requireRole('SUPER_ADMIN'),
  validate(b2cPaymentValidation),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { phoneNumber, amount, commandId, remarks, orderId } = req.body;

    const result = await mpesaService.initiateB2CPayment(
      phoneNumber,
      amount,
      commandId || 'BusinessPayment',
      remarks || 'Payment from Coinsend',
      orderId,
      req.admin!.adminId
    );

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.adminId,
        action: 'MPESA_B2C_PAYMENT',
        entityType: 'MpesaTransaction',
        details: {
          phoneNumber,
          amount,
          conversationId: result.ConversationID,
          orderId,
        },
      },
    });

    res.json({
      success: true,
      message: 'B2C payment initiated successfully',
      data: {
        conversationId: result.ConversationID,
        originatorConversationId: result.OriginatorConversationID,
      },
    });
  })
);

// Get M-Pesa Transaction History
router.get(
  '/mpesa/transactions',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { page, limit, type, status, startDate, endDate, search } = req.query;

    const result = await mpesaService.getTransactionHistory({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      type: type as any,
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      search: search as string,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

// Get single M-Pesa Transaction
router.get(
  '/mpesa/transactions/:id',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { id: req.params.id },
      include: {
        order: true,
        initiatedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    res.json({
      success: true,
      data: { transaction },
    });
  })
);

// Initiate Transaction Reversal (SUPER_ADMIN only)
const reversalValidation = [
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('remarks').optional().trim().isLength({ max: 100 }),
];

router.post(
  '/mpesa/reversal',
  requireRole('SUPER_ADMIN'),
  validate(reversalValidation),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { transactionId, amount, remarks } = req.body;

    // Find the original transaction by ID to get the M-Pesa receipt number
    const originalTx = await mpesaService.getTransactionForReversal(transactionId);
    if (!originalTx) {
      throw new AppError('Transaction not found or cannot be reversed', 404);
    }

    if (!originalTx.mpesaReceiptNumber) {
      throw new AppError('Transaction has no M-Pesa receipt number', 400);
    }

    const result = await mpesaService.initiateReversal(
      originalTx.mpesaReceiptNumber,
      amount,
      remarks || 'Transaction Reversal',
      req.admin!.adminId
    );

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.adminId,
        action: 'MPESA_REVERSAL',
        entityType: 'MpesaTransaction',
        details: {
          originalTransactionId: transactionId,
          mpesaReceiptNumber: originalTx.mpesaReceiptNumber,
          amount,
          conversationId: result.ConversationID,
        },
      },
    });

    res.json({
      success: true,
      message: 'Reversal initiated successfully',
      data: {
        conversationId: result.ConversationID,
        originatorConversationId: result.OriginatorConversationID,
      },
    });
  })
);

// ============ BALANCE TRANSACTION MANAGEMENT ============

// Get pending balance transactions (for reconciliation)
router.get(
  '/balance/transactions/pending',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const transactions = await prisma.balanceTransaction.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        userBalance: {
          include: {
            user: {
              select: { email: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: { transactions },
    });
  })
);

// Manually complete a balance transaction (for reconciliation)
router.post(
  '/balance/transactions/:id/complete',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate([
    body('mpesaReceiptNumber').optional().trim(),
  ]),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { id } = req.params;
    const { mpesaReceiptNumber } = req.body;

    const transaction = await prisma.balanceTransaction.findUnique({
      where: { id },
      include: { userBalance: true },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.status !== 'PENDING') {
      throw new AppError(`Transaction is already ${transaction.status}`, 400);
    }

    if (transaction.type === 'DEPOSIT') {
      // For deposits, add to balance
      const depositAmount = Number(transaction.amount);
      const currentBalance = Number(transaction.userBalance.balance);
      const newBalance = currentBalance + depositAmount;

      await prisma.$transaction([
        prisma.userBalance.update({
          where: { id: transaction.userBalanceId },
          data: { balance: newBalance },
        }),
        prisma.balanceTransaction.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            balanceAfter: newBalance,
            reference: mpesaReceiptNumber || transaction.reference,
            description: `Manually completed by admin. Receipt: ${mpesaReceiptNumber || 'N/A'}`,
            completedAt: new Date(),
          },
        }),
      ]);
    } else if (transaction.type === 'WITHDRAWAL') {
      // For withdrawals, just mark as completed (balance already deducted)
      await prisma.balanceTransaction.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          reference: mpesaReceiptNumber || transaction.reference,
          description: `Withdrawal completed. Receipt: ${mpesaReceiptNumber || 'N/A'}`,
          completedAt: new Date(),
        },
      });
    } else {
      throw new AppError('Can only manually complete DEPOSIT or WITHDRAWAL transactions', 400);
    }

    const updatedTransaction = await prisma.balanceTransaction.findUnique({
      where: { id },
    });

    res.json({
      success: true,
      message: `Transaction marked as completed`,
      data: { transaction: updatedTransaction },
    });
  })
);

// ============ TRON/USDT MANAGEMENT ============

// Get TRON wallet summary
router.get(
  '/tron/wallet',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const summary = await tronService.getWalletSummary();
    res.json({
      success: true,
      data: summary,
    });
  })
);

// Get TRON transactions
router.get(
  '/tron/transactions',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn(['DEPOSIT', 'WITHDRAWAL']),
    query('status').optional().isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'FAILED']),
  ]),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { page, limit, type, status } = req.query;

    const result = await tronService.getRecentTransactions({
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      type: type as 'DEPOSIT' | 'WITHDRAWAL' | undefined,
      status: status as 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED' | undefined,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

// Manually check for new deposits
router.post(
  '/tron/check-deposits',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const newDeposits = await tronService.checkNewDeposits();

    res.json({
      success: true,
      message: `Checked for deposits. Found ${newDeposits} new deposit(s).`,
      data: { newDeposits },
    });
  })
);

// Send USDT (SUPER_ADMIN only)
const sendUsdtValidation = [
  body('toAddress').notEmpty().withMessage('Recipient address is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1 USDT'),
  body('orderId').optional().trim(),
];

router.post(
  '/tron/send',
  requireRole('SUPER_ADMIN'),
  validate(sendUsdtValidation),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { toAddress, amount, orderId } = req.body;

    // Validate address
    if (!tronService.isValidAddress(toAddress)) {
      throw new AppError('Invalid TRON address', 400);
    }

    const result = await tronService.sendUsdt(toAddress, amount, orderId);

    if (!result.success) {
      throw new AppError(result.error || 'Failed to send USDT', 400);
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.adminId,
        action: 'TRON_SEND_USDT',
        entityType: 'CryptoTransaction',
        details: {
          toAddress,
          amount,
          txHash: result.txHash,
          orderId,
        },
      },
    });

    res.json({
      success: true,
      message: `Successfully sent ${amount} USDT`,
      data: { txHash: result.txHash },
    });
  })
);

// Validate TRON address
router.get(
  '/tron/validate-address',
  validate([
    query('address').notEmpty().withMessage('Address is required'),
  ]),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { address } = req.query;
    const isValid = tronService.isValidAddress(address as string);

    res.json({
      success: true,
      data: { address, isValid },
    });
  })
);

// Manually trigger deposit check (for debugging)
router.post(
  '/tron/check-deposits',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { depositMonitor } = await import('../services/depositMonitor.service');

    // Get pending intents for debugging
    const pendingIntents = await prisma.pendingUsdtDeposit.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Manually trigger deposit check
    const newDeposits = await depositMonitor.manualCheck();

    // Get recent crypto transactions
    const recentDeposits = await prisma.cryptoTransaction.findMany({
      where: { type: 'DEPOSIT' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      message: `Manual deposit check completed. Found ${newDeposits} new deposits.`,
      data: {
        newDepositsFound: newDeposits,
        monitorStatus: depositMonitor.getStatus(),
        pendingIntents: pendingIntents.map(i => ({
          id: i.id,
          user: i.user.email,
          expectedAmount: Number(i.expectedAmount),
          status: i.status,
          expiresAt: i.expiresAt,
          createdAt: i.createdAt,
        })),
        recentDeposits: recentDeposits.map(d => ({
          txHash: d.txHash,
          amount: Number(d.amount),
          fromAddress: d.fromAddress,
          status: d.status,
          createdAt: d.createdAt,
        })),
      },
    });
  })
);

// Credit user balance manually (for missed deposits)
router.post(
  '/users/:userId/credit-deposit',
  requireRole('SUPER_ADMIN'),
  validate([
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('txHash').notEmpty().withMessage('Transaction hash is required'),
    body('usdtAmount').isFloat({ min: 0.01 }).withMessage('USDT amount is required'),
  ]),
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const { userId } = req.params;
    const { amount, txHash, usdtAmount } = req.body;

    // Get or create user balance
    let userBalance = await prisma.userBalance.findUnique({
      where: { userId },
    });

    if (!userBalance) {
      userBalance = await prisma.userBalance.create({
        data: {
          userId,
          balance: 0,
          usdtBalance: 0,
          currency: 'KES',
        },
      });
    }

    const currentBalance = Number(userBalance.balance);
    const newBalance = currentBalance + amount;

    // Credit the balance
    await prisma.$transaction([
      prisma.userBalance.update({
        where: { userId },
        data: { balance: newBalance },
      }),
      prisma.balanceTransaction.create({
        data: {
          userBalanceId: userBalance.id,
          type: 'USDT_DEPOSIT',
          status: 'COMPLETED',
          currency: 'KES',
          amount: amount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          txHash,
          reference: txHash,
          description: `Manual credit: ${usdtAmount} USDT → KES ${amount.toFixed(2)} (Admin: ${req.admin!.email})`,
          completedAt: new Date(),
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Credited KES ${amount.toFixed(2)} to user`,
      data: {
        userId,
        previousBalance: currentBalance,
        newBalance,
        creditedAmount: amount,
      },
    });
  })
);

export default router;
