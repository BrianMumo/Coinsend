import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validator';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { mpesaService } from '../services/mpesa.service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * Initiate STK Push for an order
 * POST /api/mpesa/stkpush
 */
router.post(
  '/stkpush',
  authenticate,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  ],
  validate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderId, phoneNumber } = req.body;
    const userId = req.user!.userId;

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    if (order.status !== 'PENDING') {
      throw new AppError(`Cannot pay for order in ${order.status} status`, 400);
    }

    // Check if order requires KES payment (KES_TO_CRYPTO or CROSS_BORDER)
    if (order.orderType !== 'KES_TO_CRYPTO' && order.orderType !== 'CROSS_BORDER') {
      throw new AppError('STK Push is only available for KES payments', 400);
    }

    // Initiate STK Push
    const result = await mpesaService.initiateSTKPush(
      phoneNumber,
      Number(order.sourceAmount),
      order.orderNumber,
      `Coinsend - ${order.orderType === 'KES_TO_CRYPTO' ? 'Buy Crypto' : 'Cross-Border Transfer'}`
    );

    // Store CheckoutRequestID in paymentReference for callback matching
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentReference: result.CheckoutRequestID,
        paymentMethod: 'MPESA_STK',
      },
    });

    res.json({
      success: true,
      message: result.CustomerMessage,
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
    });
  })
);

/**
 * Query STK Push status
 * GET /api/mpesa/status/:checkoutRequestId
 */
router.get(
  '/status/:checkoutRequestId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { checkoutRequestId } = req.params;

    const result = await mpesaService.querySTKStatus(checkoutRequestId);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * M-Pesa Callback endpoint (called by Safaricom)
 * POST /api/mpesa/callback
 */
router.post(
  '/callback',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('M-Pesa Callback received:', JSON.stringify(req.body));

    // Process the callback
    await mpesaService.processCallback(req.body);

    // Always respond with success to Safaricom
    res.json({
      ResultCode: 0,
      ResultDesc: 'Callback received successfully',
    });
  })
);

/**
 * Check order payment status
 * GET /api/mpesa/order-status/:orderId
 */
router.get(
  '/order-status/:orderId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;
    const userId = req.user!.userId;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paidAt: true,
        paymentReference: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Verify order belongs to user
    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (fullOrder?.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        isPaid: order.status === 'PAID' || order.status === 'PROCESSING' || order.status === 'COMPLETED',
        paidAt: order.paidAt,
      },
    });
  })
);

export default router;
