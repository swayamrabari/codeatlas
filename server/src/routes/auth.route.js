import { Router } from 'express';
import {
    register,
    verifyEmail,
    login,
    getMe,
    resendCode,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/auth/register', register);
router.post('/auth/verify-email', verifyEmail);
router.post('/auth/login', login);
router.post('/auth/resend-code', resendCode);

// Protected routes
router.get('/auth/me', authenticate, getMe);

export default router;
