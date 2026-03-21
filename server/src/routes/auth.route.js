import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  getMe,
  resendCode,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Public routes
router.post('/auth/register', authRateLimiter, register);
router.post('/auth/verify-email', authRateLimiter, verifyEmail);
router.post('/auth/login', authRateLimiter, login);
router.post('/auth/resend-code', authRateLimiter, resendCode);

// Protected routes
router.get('/auth/me', authenticate, getMe);

export default router;
