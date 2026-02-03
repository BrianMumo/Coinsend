import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { orderService } from '../services/order.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validator';
import { asyncHandler } from '../middleware/errorHandler';
import { orderLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createOrderValidation = [
  body('orderType')
    .isIn(['CRYPTO_TO_KES', 'KES_TO_CRYPTO', 'CROSS_BORDER', 'OTC'])
    .withMessage('Invalid order type'),
  body('sourceCurrency').notEmpty().withMessage('Source currency is required'),
  body('destinationCurrency').notEmpty().withMessage('Destination currency is required'),
  body('sourceAmount')
    .isFloat({ min: 1 })
    .withMessage('Source amount must be a positive number'),
  body('payoutDestination').optional().notEmpty(),
  body('recipientName').optional().trim().isLength({ min: 2 }),
  body('recipientPhone').optional().isMobilePhone('any'),
  body('recipientBank').optional().trim(),
  body('recipientAccount').optional().trim(),
];

const submitProofValidation = [
  body('proofUrl').isURL().withMessage('Valid proof URL is required'),
  body('paymentReference').optional().trim(),
];

// Create order
router.post(
  '/',
  orderLimiter,
  validate(createOrderValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await orderService.createOrder(req.user!.userId, req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Order created successfully',
    });
  })
);

// Get user's orders
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, sortBy, sortOrder, status, orderType } = req.query;

    const result = await orderService.getUserOrders(req.user!.userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      status: status as any,
      orderType: orderType as any,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

// Get single order
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await orderService.getOrderById(req.params.id, req.user!.userId);
    res.json({
      success: true,
      data: result,
    });
  })
);

// Submit payment proof
router.post(
  '/:id/proof',
  validate(submitProofValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { proofUrl, paymentReference } = req.body;
    const order = await orderService.submitPaymentProof(
      req.params.id,
      req.user!.userId,
      proofUrl,
      paymentReference
    );
    res.json({
      success: true,
      data: { order },
      message: 'Payment proof submitted successfully',
    });
  })
);

// Cancel order
router.post(
  '/:id/cancel',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await orderService.cancelOrder(req.params.id, req.user!.userId);
    res.json({
      success: true,
      data: { order },
      message: 'Order cancelled successfully',
    });
  })
);

export default router;
