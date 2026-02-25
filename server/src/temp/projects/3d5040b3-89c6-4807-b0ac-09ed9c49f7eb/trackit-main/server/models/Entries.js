const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'investment', 'savings'],
      required: true,
    },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Entry', entrySchema);
