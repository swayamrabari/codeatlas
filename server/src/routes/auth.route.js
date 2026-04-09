import { Router } from 'express';
import {
  forgotPassword,
  register,
  getMe,
  login,
  resendCode,
  verifyResetCode,
  resetPassword,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Public routes
router.post('/auth/register', authRateLimiter, register);
router.post('/auth/verify-email', authRateLimiter, verifyEmail);
router.post('/auth/login', authRateLimiter, login);
router.post('/auth/resend-code', authRateLimiter, resendCode);
router.post('/auth/forgot-password', authRateLimiter, forgotPassword);
router.post('/auth/verify-reset-code', authRateLimiter, verifyResetCode);
router.post('/auth/reset-password', authRateLimiter, resetPassword);

// Protected routes
router.get('/auth/me', authenticate, getMe);

export default router;
