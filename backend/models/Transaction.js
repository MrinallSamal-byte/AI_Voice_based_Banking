const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['credit', 'debit', 'transfer', 'recharge', 'bill_payment']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  recipient: {
    name: String,
    phone: String,
    accountNumber: String
  },
  sender: {
    name: String,
    phone: String,
    accountNumber: String
  },
  description: String,
  metadata: {
    mobileNumber: String,
    operator: String,
    billType: String,
    upiId: String,
    referenceNumber: String
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded']
  },
  failureReason: String,
  initiatedVia: {
    type: String,
    default: 'voice',
    enum: ['voice', 'sms', 'web', 'app', 'ivr']
  },
  language: {
    type: String,
    default: 'hi-IN'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
transactionSchema.index({ userId: 1, timestamp: -1 });
transactionSchema.index({ transactionId: 1, status: 1 });
transactionSchema.index({ userId: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
