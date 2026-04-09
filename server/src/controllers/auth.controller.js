import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import {
  generateVerificationCode,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../services/email.service.js';

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function getEmailDeliveryErrorMessage() {
  return 'Unable to send OTP email right now. Please verify BREVO_API_KEY, BREVO_FROM_EMAIL, and sender identity in Brevo.';
}

/**
 * Generate a JWT token for a user
 */
function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * POST /api/auth/register
 * Register a new user and send verification email
 */
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // Validate input
    if (!name || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters.' });
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res
        .status(400)
        .json({ error: 'Please enter a valid email address.' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // If user exists but isn't verified, allow re-registration
      if (!existingUser.isVerified) {
        const code = generateVerificationCode();
        existingUser.name = name;
        existingUser.password = password;
        existingUser.verificationCode = code;
        existingUser.verificationCodeExpires = new Date(
          Date.now() + 10 * 60 * 1000,
        );
        await existingUser.save();

        try {
          await sendVerificationEmail(normalizedEmail, name, code);
        } catch (mailErr) {
          logger.error('Verification resend during register failed', {
            email: normalizedEmail,
            message: mailErr.message,
          });

          return res
            .status(502)
            .json({ error: getEmailDeliveryErrorMessage() });
        }

        return res.status(200).json({
          message: 'Verification code resent. Please check your email.',
          email: existingUser.email,
        });
      }

      return res
        .status(409)
        .json({ error: 'An account with this email already exists.' });
    }

    // Generate verification code
    const code = generateVerificationCode();

    // Create user
    const user = new User({
      name,
      email: normalizedEmail,
      password,
      verificationCode: code,
      verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(normalizedEmail, name, code);
    } catch (mailErr) {
      logger.error('Verification email send failed during register', {
        email: normalizedEmail,
        message: mailErr.message,
      });

      return res.status(502).json({ error: getEmailDeliveryErrorMessage() });
    }

    logger.info('New user registered', { email: normalizedEmail });

    res.status(201).json({
      message:
        'Registration successful! Please check your email for the verification code.',
      email: user.email,
    });
  } catch (err) {
    logger.error('Registration error', err.message);

    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages[0] });
    }

    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}

/**
 * POST /api/auth/verify-email
 * Verify email with 6-digit code
 */
export async function verifyEmail(req, res) {
  try {
    const { email, code } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code) {
      return res
        .status(400)
        .json({ error: 'Email and verification code are required.' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+verificationCode +verificationCodeExpires',
    );

    if (!user) {
      return res.status(404).json({
        error:
          'No pending verification found for this email. Please login again or resend a code.',
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      return res.status(400).json({
        error: 'No verification code found. Please request a new one.',
      });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new one.',
      });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Mark as verified and clear code
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Generate token and auto-login
    const token = signToken(user._id);

    logger.info('Email verified', { email: normalizedEmail });

    res.status(200).json({
      message: 'Email verified successfully!',
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    logger.error('Verification error', err.message);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ error: 'Email and password are required.' });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password',
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        code: 'ACCOUNT_BLOCKED',
        error: 'Your account has been blocked. Contact support for help.',
        blocked: true,
        blockReason: user.blockReason || null,
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if email is verified
    if (!user.isVerified && !user.isAdmin) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        needsVerification: true,
        email: user.email,
      });
    }

    // Generate token
    const token = signToken(user._id);

    logger.info('User logged in successfully');

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    logger.error('Login error', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function getMe(req, res) {
  try {
    res.status(200).json({ user: req.user.toJSON() });
  } catch (err) {
    logger.error('Get user error', err.message);
    res.status(500).json({ error: 'Failed to get user data.' });
  }
}

/**
 * POST /api/auth/resend-code
 * Resend verification code
 */
export async function resendCode(req, res) {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    // Generate new code
    const code = generateVerificationCode();
    user.verificationCode = code;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationEmail(normalizedEmail, user.name, code);
    } catch (mailErr) {
      logger.error('Verification resend failed', {
        email: normalizedEmail,
        message: mailErr.message,
      });

      return res.status(502).json({ error: getEmailDeliveryErrorMessage() });
    }

    logger.info('Verification code resent', { email: normalizedEmail });

    res.status(200).json({
      message: 'Verification code resent. Please check your email.',
    });
  } catch (err) {
    logger.error('Resend code error', err.message);
    res.status(500).json({ error: 'Failed to resend code. Please try again.' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Send password reset OTP to the user's email.
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+resetPasswordCode +resetPasswordCodeExpires',
    );

    // Always return success for unknown emails to avoid account enumeration.
    if (!user) {
      return res.status(200).json({
        message:
          'If this email is registered, a password reset code has been sent.',
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        code: 'ACCOUNT_BLOCKED',
        error: 'Your account has been blocked. Contact support for help.',
        blocked: true,
        blockReason: user.blockReason || null,
      });
    }

    const code = generateVerificationCode();
    user.resetPasswordCode = code;
    user.resetPasswordCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendPasswordResetEmail(normalizedEmail, user.name, code);
    } catch (mailErr) {
      logger.error('Password reset email send failed', {
        email: normalizedEmail,
        message: mailErr.message,
      });

      return res.status(502).json({ error: getEmailDeliveryErrorMessage() });
    }

    return res.status(200).json({
      message:
        'If this email is registered, a password reset code has been sent.',
    });
  } catch (err) {
    logger.error('Forgot password error', err.message);
    return res
      .status(500)
      .json({ error: 'Failed to start password reset. Please try again.' });
  }
}

/**
 * POST /api/auth/verify-reset-code
 * Verify forgot-password OTP before showing new password fields.
 */
export async function verifyResetCode(req, res) {
  try {
    const { email, code } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code) {
      return res
        .status(400)
        .json({ error: 'Email and reset code are required.' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+resetPasswordCode +resetPasswordCodeExpires',
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or reset code.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        code: 'ACCOUNT_BLOCKED',
        error: 'Your account has been blocked. Contact support for help.',
        blocked: true,
        blockReason: user.blockReason || null,
      });
    }

    if (!user.resetPasswordCode || !user.resetPasswordCodeExpires) {
      return res.status(400).json({
        error: 'No reset code found. Please request a new password reset OTP.',
      });
    }

    if (user.resetPasswordCodeExpires < new Date()) {
      return res
        .status(400)
        .json({ error: 'Reset code has expired. Please request a new one.' });
    }

    if (String(user.resetPasswordCode) !== String(code)) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    return res.status(200).json({
      message: 'OTP verified successfully. You can now set a new password.',
      verified: true,
    });
  } catch (err) {
    logger.error('Verify reset code error', err.message);
    return res
      .status(500)
      .json({ error: 'Failed to verify reset code. Please try again.' });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset user password using email + OTP code + new password.
 */
export async function resetPassword(req, res) {
  try {
    const { email, code, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code || !password) {
      return res
        .status(400)
        .json({ error: 'Email, code, and new password are required.' });
    }

    if (String(password).length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters.' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password +resetPasswordCode +resetPasswordCodeExpires',
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        code: 'ACCOUNT_BLOCKED',
        error: 'Your account has been blocked. Contact support for help.',
        blocked: true,
        blockReason: user.blockReason || null,
      });
    }

    if (!user.resetPasswordCode || !user.resetPasswordCodeExpires) {
      return res.status(400).json({
        error: 'No reset code found. Please request a new password reset OTP.',
      });
    }

    if (user.resetPasswordCodeExpires < new Date()) {
      return res
        .status(400)
        .json({ error: 'Reset code has expired. Please request a new one.' });
    }

    if (String(user.resetPasswordCode) !== String(code)) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    user.password = password;
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpires = undefined;
    await user.save();

    logger.info('Password reset successful', { email: normalizedEmail });

    return res.status(200).json({
      message: 'Password reset successful. You can now log in.',
    });
  } catch (err) {
    logger.error('Reset password error', err.message);
    return res
      .status(500)
      .json({ error: 'Failed to reset password. Please try again.' });
  }
}
