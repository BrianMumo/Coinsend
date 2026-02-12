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
  validate([
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    logger.info('=== STK PUSH REQUEST RECEIVED ===');
    logger.info(`Body: ${JSON.stringify(req.body)}`);

    const { orderId, phoneNumber } = req.body;
    const userId = req.user!.userId;

    logger.info(`User ID: ${userId}, Order ID: ${orderId}, Phone: ${phoneNumber}`);

    // Find the order
    logger.info(`Looking up order: ${orderId}`);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      logger.error(`Order not found: ${orderId}`);
      throw new AppError('Order not found', 404);
    }

    logger.info(`Order found: ${order.orderNumber}, Status: ${order.status}, Type: ${order.orderType}`);

    if (order.userId !== userId) {
      logger.error(`Access denied - Order userId: ${order.userId}, Request userId: ${userId}`);
      throw new AppError('Access denied', 403);
    }

    if (order.status !== 'PENDING') {
      logger.error(`Invalid order status: ${order.status}`);
      throw new AppError(`Cannot pay for order in ${order.status} status`, 400);
    }

    // Check if order requires KES payment (KES_TO_CRYPTO or CROSS_BORDER)
    if (order.orderType !== 'KES_TO_CRYPTO' && order.orderType !== 'CROSS_BORDER') {
      logger.error(`Invalid order type for STK Push: ${order.orderType}`);
      throw new AppError('STK Push is only available for KES payments', 400);
    }

    // Initiate STK Push
    logger.info(`Calling mpesaService.initiateSTKPush for ${phoneNumber}, Amount: ${order.sourceAmount}`);
    const result = await mpesaService.initiateSTKPush(
      phoneNumber,
      Number(order.sourceAmount),
      order.orderNumber,
      `Coinsend - ${order.orderType === 'KES_TO_CRYPTO' ? 'Buy Crypto' : 'Cross-Border Transfer'}`
    );

    logger.info(`STK Push initiated successfully: ${JSON.stringify(result)}`);

    // Store CheckoutRequestID in paymentReference for callback matching
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentReference: result.CheckoutRequestID,
        paymentMethod: 'MPESA_STK',
      },
    });

    logger.info(`Order updated with CheckoutRequestID: ${result.CheckoutRequestID}`);

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

// ============ B2C CALLBACK ENDPOINTS ============

/**
 * B2C Result Callback endpoint (called by Safaricom)
 * POST /api/mpesa/b2c/result
 */
router.post(
  '/b2c/result',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('B2C Result Callback received:', JSON.stringify(req.body));

    const { Result } = req.body;
    const { ResultCode, OriginatorConversationID, TransactionID, ResultParameters } = Result || {};

    // Extract M-Pesa receipt number from result parameters
    let mpesaReceiptNumber = TransactionID;
    if (ResultCode === 0 && ResultParameters?.ResultParameter) {
      for (const param of ResultParameters.ResultParameter) {
        if (param.Key === 'TransactionReceipt') {
          mpesaReceiptNumber = String(param.Value);
          break;
        }
      }
    }

    // Check if this is a balance withdrawal (old WITHDRAWAL or new KES_WITHDRAWAL)
    const withdrawalTx = await prisma.balanceTransaction.findFirst({
      where: {
        reference: OriginatorConversationID,
        type: { in: ['WITHDRAWAL', 'KES_WITHDRAWAL'] },
        status: 'PENDING',
      },
    });

    if (withdrawalTx) {
      // Delegate to appropriate callback handler
      const { balanceService } = await import('../services/balance.service');
      if (withdrawalTx.type === 'KES_WITHDRAWAL') {
        await balanceService.processKesWithdrawalCallback(
          OriginatorConversationID,
          ResultCode === 0,
          mpesaReceiptNumber
        );
      } else {
        await balanceService.processWithdrawalCallback(
          OriginatorConversationID,
          ResultCode === 0,
          mpesaReceiptNumber
        );
      }
      logger.info(`Processed ${withdrawalTx.type} callback for transaction ${withdrawalTx.id}`);
    }

    // Also process in MpesaTransaction table for audit trail
    await mpesaService.processB2CCallback(req.body);

    res.json({
      ResultCode: 0,
      ResultDesc: 'Callback received successfully',
    });
  })
);

/**
 * B2C Timeout Callback endpoint (called by Safaricom)
 * POST /api/mpesa/b2c/timeout
 */
router.post(
  '/b2c/timeout',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('B2C Timeout Callback received:', JSON.stringify(req.body));

    const { OriginatorConversationID } = req.body.Result || {};

    if (OriginatorConversationID) {
      // Check if this is a balance withdrawal (old WITHDRAWAL or new KES_WITHDRAWAL)
      const withdrawalTx = await prisma.balanceTransaction.findFirst({
        where: {
          reference: OriginatorConversationID,
          type: { in: ['WITHDRAWAL', 'KES_WITHDRAWAL'] },
          status: 'PENDING',
        },
      });

      if (withdrawalTx) {
        // Mark as failed and refund
        const { balanceService } = await import('../services/balance.service');
        if (withdrawalTx.type === 'KES_WITHDRAWAL') {
          await balanceService.processKesWithdrawalCallback(
            OriginatorConversationID,
            false // failed
          );
        } else {
          await balanceService.processWithdrawalCallback(
            OriginatorConversationID,
            false // failed
          );
        }
        logger.info(`Processed ${withdrawalTx.type} timeout for transaction ${withdrawalTx.id}`);
      }

      // Update MpesaTransaction table
      await prisma.mpesaTransaction.updateMany({
        where: { originatorConversationId: OriginatorConversationID },
        data: {
          status: 'TIMEOUT',
          resultDesc: 'Transaction timed out',
          completedAt: new Date(),
        },
      });
    }

    res.json({
      ResultCode: 0,
      ResultDesc: 'Timeout received',
    });
  })
);

/**
 * Account Balance Result Callback endpoint (called by Safaricom)
 * POST /api/mpesa/balance/result
 */
router.post(
  '/balance/result',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Balance Callback received:', JSON.stringify(req.body));

    await mpesaService.processBalanceCallback(req.body);

    res.json({
      ResultCode: 0,
      ResultDesc: 'Callback received successfully',
    });
  })
);

/**
 * Account Balance Timeout Callback endpoint (called by Safaricom)
 * POST /api/mpesa/balance/timeout
 */
router.post(
  '/balance/timeout',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Balance Timeout Callback received:', JSON.stringify(req.body));

    const { OriginatorConversationID } = req.body.Result || {};

    if (OriginatorConversationID) {
      await prisma.mpesaTransaction.updateMany({
        where: { originatorConversationId: OriginatorConversationID },
        data: {
          status: 'TIMEOUT',
          resultDesc: 'Balance query timed out',
          completedAt: new Date(),
        },
      });
    }

    res.json({
      ResultCode: 0,
      ResultDesc: 'Timeout received',
    });
  })
);

// ============ REVERSAL CALLBACK ENDPOINTS ============

/**
 * Reversal Result Callback endpoint (called by Safaricom)
 * POST /api/mpesa/reversal/result
 */
router.post(
  '/reversal/result',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Reversal Result Callback received:', JSON.stringify(req.body));

    await mpesaService.processReversalCallback(req.body);

    res.json({
      ResultCode: 0,
      ResultDesc: 'Callback received successfully',
    });
  })
);

/**
 * Reversal Timeout Callback endpoint (called by Safaricom)
 * POST /api/mpesa/reversal/timeout
 */
router.post(
  '/reversal/timeout',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Reversal Timeout Callback received:', JSON.stringify(req.body));

    const { OriginatorConversationID } = req.body.Result || {};

    if (OriginatorConversationID) {
      await prisma.mpesaTransaction.updateMany({
        where: { originatorConversationId: OriginatorConversationID },
        data: {
          status: 'TIMEOUT',
          resultDesc: 'Reversal request timed out',
          completedAt: new Date(),
        },
      });
    }

    res.json({
      ResultCode: 0,
      ResultDesc: 'Timeout received',
    });
  })
);

export default router;
