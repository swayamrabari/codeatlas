import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {
    generateVerificationCode,
    sendVerificationEmail,
} from '../services/email.service.js';

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

        // Validate input
        if (!name || !email || !password) {
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
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            // If user exists but isn't verified, allow re-registration
            if (!existingUser.isVerified) {
                const code = generateVerificationCode();
                existingUser.name = name;
                existingUser.password = password;
                existingUser.verificationCode = code;
                existingUser.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
                await existingUser.save();

                await sendVerificationEmail(email, name, code);

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
            email,
            password,
            verificationCode: code,
            verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        await user.save();

        // Send verification email
        await sendVerificationEmail(email, name, code);

        console.log(`✅ New user registered: ${email}`);

        res.status(201).json({
            message: 'Registration successful! Please check your email for the verification code.',
            email: user.email,
        });
    } catch (err) {
        console.error('❌ Registration error:', err.message);

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

        if (!email || !code) {
            return res.status(400).json({ error: 'Email and verification code are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select(
            '+verificationCode +verificationCodeExpires'
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ error: 'Email is already verified.' });
        }

        if (!user.verificationCode || !user.verificationCodeExpires) {
            return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
        }

        if (user.verificationCodeExpires < new Date()) {
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
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

        console.log(`✅ Email verified: ${email}`);

        res.status(200).json({
            message: 'Email verified successfully!',
            token,
            user: user.toJSON(),
        });
    } catch (err) {
        console.error('❌ Verification error:', err.message);
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

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Check if email is verified
        if (!user.isVerified) {
            return res.status(403).json({
                error: 'Please verify your email before logging in.',
                needsVerification: true,
                email: user.email,
            });
        }

        // Generate token
        const token = signToken(user._id);

        console.log(`✅ User logged in: ${email}`);

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: user.toJSON(),
        });
    } catch (err) {
        console.error('❌ Login error:', err.message);
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
        console.error('❌ Get user error:', err.message);
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

        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

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

        await sendVerificationEmail(email, user.name, code);

        console.log(`📧 Verification code resent to: ${email}`);

        res.status(200).json({
            message: 'Verification code resent. Please check your email.',
        });
    } catch (err) {
        console.error('❌ Resend code error:', err.message);
        res.status(500).json({ error: 'Failed to resend code. Please try again.' });
    }
}
