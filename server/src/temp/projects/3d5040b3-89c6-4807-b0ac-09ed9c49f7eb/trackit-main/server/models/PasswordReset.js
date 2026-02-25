const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['forgot-password', 'change-password'],
    default: 'forgot-password'
  },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Index for automatic expiration cleanup
passwordResetSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);

