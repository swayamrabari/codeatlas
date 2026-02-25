const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const PendingUser = require('../models/PendingUser');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const sendOtpMail = require('../utils/sendOtpMail');
const sendPasswordResetMail = require('../utils/sendPasswordResetMail');
const generateToken = require('../utils/generateToken');

// Helper function to get cookie options
const getCookieOptions = () => {
  const isProduction = 
    process.env.NODE_ENV === 'production' || 
    process.env.RENDER === 'true' || 
    process.env.FORCE_SECURE_COOKIES === 'true';
  
  // Check if client and server are on different domains
  // If CLIENT_URL is set and not localhost, we need cross-domain cookie settings
  const clientUrl = process.env.CLIENT_URL || '';
  const isCrossDomain = clientUrl && 
    !clientUrl.startsWith('http://localhost') && 
    !clientUrl.startsWith('http://127.0.0.1');
  
  // For cross-domain cookies, we MUST use sameSite: 'none' and secure: true
  // sameSite: 'none' requires secure: true (browser requirement)
  const useCrossDomainCookies = isProduction && isCrossDomain;
  
  return {
    httpOnly: true,
    secure: useCrossDomainCookies || isProduction, // Must be true when sameSite is 'none'
    sameSite: useCrossDomainCookies ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
};

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ message: 'User with this email already exists' });
    }

    await PendingUser.deleteOne({ email });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, salt);
    const otpExpires = Date.now() + 10 * 60 * 1000;

    await PendingUser.create({
      name,
      email,
      password: hashedPassword,
      otp: hashedOtp,
      otpExpires,
    });

    await sendOtpMail(email, otp);

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    logger.error('Error in register', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const pendingUser = await PendingUser.findOne({ email });
    if (!pendingUser) {
      return res.status(400).json({ message: 'No pending registration found' });
    }
    if (pendingUser.otpExpires < Date.now()) {
      await PendingUser.deleteOne({ email });
      return res.status(400).json({ message: 'OTP expired' });
    }
    const isMatch = await bcrypt.compare(otp, pendingUser.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    const user = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      provider: 'local',
      categories: { income: [], expense: [], investment: [], savings: [] },
    });

    await PendingUser.deleteOne({ email });
    const token = generateToken(user);

    const cookieOptions = getCookieOptions();
    res.cookie('token', token, cookieOptions);

    logger.info('User registered successfully', { userId: user._id, email: user.email });

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
      },
      token,
    });
  } catch (error) {
    logger.error('Error in verifyOtp', { error: error.message, stack: error.stack, email: req.body.email });
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const pendingUser = await PendingUser.findOne({ email });
    if (!pendingUser) {
      return res.status(400).json({ message: 'No pending registration found' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);
    const otpExpires = Date.now() + 10 * 60 * 1000;
    pendingUser.otp = hashedOtp;
    pendingUser.otpExpires = otpExpires;
    await pendingUser.save();
    await sendOtpMail(email, otp);

    res.status(200).json({ message: 'New OTP resent to email' });
  } catch (error) {
    logger.error('Error in resendOtp', { error: error.message, stack: error.stack, email: req.body.email });
    res.status(500).json({ message: 'Server error' });
  }
};

// login exising user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    const token = generateToken(user);
    
    const cookieOptions = getCookieOptions();
    res.cookie('token', token, cookieOptions);

    logger.info('User logged in successfully', { userId: user._id, email: user.email });

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
      },
      token,
    });
  } catch (error) {
    logger.error('Error in login', { error: error.message, stack: error.stack, email: req.body.email });
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logoutUser = (req, res) => {
  // Clear cookie with same options used to set it
  const cookieOptions = getCookieOptions();
  res.clearCookie('token', {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  });
  
  logger.info('User logged out', { userId: req.user?.id });
  
  res.status(200).json({ message: 'Logged out successfully' });
};

exports.getCurrentUser = async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
      },
    });
  } catch (error) {
    logger.error('Error in getCurrentUser', { error: error.message, stack: error.stack });
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Bulk fetch all user data (entries, budgets, categories, chats)
exports.getAllUserData = async (req, res) => {
  try {
    const Entry = require('../models/Entries');
    const Budget = require('../models/Budgets');
    const Chat = require('../models/Chat');

    const userId = req.user._id;

    // Fetch all data in parallel
    const [entries, budgets, chats] = await Promise.all([
      Entry.find({ userId }).sort({ date: -1, createdAt: -1 }),
      Budget.find({ userId }).sort({ createdAt: -1 }),
      Chat.find({ userId }).sort({ updatedAt: -1 }),
    ]);

    // Get user with categories
    const user = await User.findById(userId).select('categories');

    res.status(200).json({
      entries,
      budgets,
      categories: user.categories || {
        income: [],
        expense: [],
        investment: [],
        savings: [],
      },
      chats,
    });
  } catch (error) {
    logger.error('Error fetching all user data', { error: error.message, stack: error.stack, userId: req.user?._id });
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password - request OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Normalize email for case-insensitive search
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if user exists in database - only send OTP if user exists
    const user = await User.findOne({ 
      email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } 
    });
    
    // If no user found, return error - user doesn't exist
    if (!user || !user._id || !user.email) {
      logger.warn('Password reset requested for non-existent email', { email: normalizedEmail });
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // User exists and is valid - proceed with OTP generation
    // Delete any existing password reset requests for this email
    await PasswordReset.deleteMany({ email: user.email, type: 'forgot-password' });

    const salt = await bcrypt.genSalt(10);
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, salt);
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await PasswordReset.create({
      email: user.email,
      otp: hashedOtp,
      otpExpires,
      type: 'forgot-password',
      verified: false,
    });

    // Send email to existing user
    try {
      await sendPasswordResetMail(user.email, otp, 'forgot-password');
      logger.info('Password reset OTP sent', { email: user.email });
      res.status(200).json({ message: 'OTP sent to your email successfully' });
    } catch (emailError) {
      logger.error('Error sending password reset email', { error: emailError.message, email: user.email });
      // If email sending fails, return error
      res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
    }
  } catch (error) {
    logger.error('Error in forgotPassword', { error: error.message, stack: error.stack, email: req.body.email });
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Verify password reset OTP
exports.verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !email.trim() || !otp || !otp.trim()) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Normalize email to match how it was stored
    const normalizedEmail = email.trim().toLowerCase();

    // Verify that user exists before allowing OTP verification
    const user = await User.findOne({ 
      email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } 
    });

    if (!user || !user._id) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const passwordReset = await PasswordReset.findOne({
      email: user.email,
      type: 'forgot-password',
      verified: false,
    });

    if (!passwordReset) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (passwordReset.otpExpires < Date.now()) {
      await PasswordReset.deleteOne({ _id: passwordReset._id });
      return res.status(400).json({ message: 'OTP expired' });
    }

    const isMatch = await bcrypt.compare(otp, passwordReset.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Mark as verified
    passwordReset.verified = true;
    await passwordReset.save();

    res.status(200).json({ 
      message: 'OTP verified successfully',
      email: user.email // Return normalized email for frontend
    });
  } catch (error) {
    logger.error('Error in verifyPasswordResetOtp', { error: error.message, stack: error.stack, email: req.body.email });
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password after OTP verification
exports.resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Normalize email to match how it was stored
    const normalizedEmail = email.trim().toLowerCase();

    // Find user first
    const user = await User.findOne({ 
      email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } 
    });

    if (!user || !user._id) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find verified password reset record
    const passwordReset = await PasswordReset.findOne({
      email: user.email,
      type: 'forgot-password',
      verified: true,
    });

    if (!passwordReset) {
      return res.status(400).json({ message: 'OTP not verified. Please verify OTP first.' });
    }

    // Check if OTP is still valid (within 10 minutes of verification)
    if (passwordReset.otpExpires < Date.now()) {
      await PasswordReset.deleteOne({ _id: passwordReset._id });
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Delete the password reset record
    await PasswordReset.deleteOne({ _id: passwordReset._id });

    logger.info('Password reset successfully', { email: user.email });
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Error in resetPassword', { error: error.message, stack: error.stack, email: req.body.email });
    res.status(500).json({ message: 'Server error' });
  }
};
