import { Router, Response } from 'express';
import { body } from 'express-validator';
import { adminService } from '../services/admin.service';
import { rateService } from '../services/rate.service';
import { authenticateAdmin, AdminRequest, requireRole } from '../middleware/adminAuth.middleware';
import { validate } from '../middleware/validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimiter';

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

// Rates
router.get(
  '/rates',
  asyncHandler(async (req: AdminRequest, res: Response) => {
    const rates = await rateService.getAllRates();
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

export default router;
