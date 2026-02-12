import { Router, Response } from 'express';
import { body } from 'express-validator';
import { authService } from '../services/auth.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimiter';
import { telegramService } from '../services/telegram.service';

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
  body('firstName').optional().trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('country').optional().isLength({ min: 2, max: 3 }).withMessage('Invalid country code'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Routes
router.post(
  '/register',
  authLimiter,
  validate(registerValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await authService.register(req.body);

    // Send Telegram notification (async, don't await)
    telegramService.notifySignup({
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      country: req.body.country || 'KE',
    }).catch(console.error);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Registration successful',
    });
  })
);

router.post(
  '/login',
  authLimiter,
  validate(loginValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await authService.login(req.body);

    // Send Telegram notification (async, don't await)
    telegramService.notifyLogin({
      email: req.body.email,
      firstName: result.user.firstName || undefined,
      lastName: result.user.lastName || undefined,
    }).catch(console.error);

    res.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.json({
      success: true,
      data: { user },
    });
  })
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // In a production app, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

export default router;
