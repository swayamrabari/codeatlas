const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  logoutUser,
  getCurrentUser,
  getAllUserData,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', getCurrentUser);
router.get('/data', protect, getAllUserData);

// Password reset (forgot password)
router.post('/forgot-password', forgotPassword);
router.post('/verify-password-reset-otp', verifyPasswordResetOtp);
router.post('/reset-password', resetPassword);

module.exports = router;

