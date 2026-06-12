import { Router, Request, Response } from 'express';
import { authenticateAdmin, AdminRequest, requireRole } from '../middleware/adminAuth.middleware';
import { asyncHandler } from '../middleware/errorHandler';
import { mpesaService } from '../services/mpesa.service';
import { logger } from '../utils/logger';

/**
 * Neutral-named payment callback routes (no provider name in the path).
 * Used for direct paybill deposit notifications.
 */
const router = Router();

/**
 * Validation endpoint (called before completing a paybill payment, if enabled).
 * We accept everything.
 * POST /api/payments/validation
 */
router.post(
  '/validation',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Payment validation received:', JSON.stringify(req.body));
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  })
);

/**
 * Confirmation endpoint (called after a customer pays the paybill).
 * Records the deposit and sends a Telegram notification.
 * POST /api/payments/confirmation
 */
router.post(
  '/confirmation',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Payment confirmation received:', JSON.stringify(req.body));

    await mpesaService.processC2BConfirmation(req.body);

    // Always acknowledge so the provider does not retry indefinitely
    res.json({ ResultCode: 0, ResultDesc: 'Confirmation received successfully' });
  })
);

/**
 * Register the validation & confirmation URLs with the provider (one-time setup).
 * Admin only.
 * POST /api/payments/register
 */
router.post(
  '/register',
  authenticateAdmin,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  asyncHandler(async (_req: AdminRequest, res: Response) => {
    const result = await mpesaService.registerC2BUrls();
    res.json({ success: true, data: result });
  })
);

export default router;
