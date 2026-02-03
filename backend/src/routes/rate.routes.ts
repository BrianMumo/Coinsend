import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { rateService } from '../services/rate.service';
import { validate } from '../middleware/validator';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Validation rules
const calculateRateValidation = [
  body('sourceCurrency').notEmpty().withMessage('Source currency is required'),
  body('destinationCurrency').notEmpty().withMessage('Destination currency is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be a positive number'),
  body('direction').isIn(['buy', 'sell']).withMessage('Direction must be "buy" or "sell"'),
];

// Get all rates (public)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const rates = await rateService.getAllRates();
    res.json({
      success: true,
      data: { rates },
    });
  })
);

// Get specific rate (public)
router.get(
  '/:pair',
  asyncHandler(async (req: Request, res: Response) => {
    const rate = await rateService.getRateByPair(req.params.pair);
    res.json({
      success: true,
      data: { rate },
    });
  })
);

// Calculate conversion (public)
router.post(
  '/calculate',
  validate(calculateRateValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await rateService.calculateRate(req.body);
    res.json({
      success: true,
      data: result,
    });
  })
);

export default router;
