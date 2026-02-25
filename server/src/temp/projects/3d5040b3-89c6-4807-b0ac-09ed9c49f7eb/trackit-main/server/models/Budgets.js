const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['expense', 'investment', 'savings'],
      required: true,
    },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    period: {
      type: String,
      enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Budget', budgetSchema);
