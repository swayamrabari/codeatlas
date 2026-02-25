const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    googleId: { type: String },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    categories: {
      income: [{ type: String }],
      expense: [{ type: String }],
      investment: [{ type: String }],
      savings: [{ type: String }],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
