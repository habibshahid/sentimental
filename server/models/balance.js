const mongoose = require('mongoose');

// Schema for host balance and credits
const HostBalanceSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCreditsAdded: {
    type: Number,
    default: 0
  },
  totalCreditsUsed: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String
  }
});

// Schema for balance transaction history
const BalanceTransactionSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['add', 'deduct', 'refund'],
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  reference: {
    type: String
  },
  performedBy: {
    type: String
  }
});

// Create indexes for efficient retrieval
BalanceTransactionSchema.index({ host: 1, timestamp: 1 });

// Create the models
const HostBalance = mongoose.model('HostBalance', HostBalanceSchema);
const BalanceTransaction = mongoose.model('BalanceTransaction', BalanceTransactionSchema);

module.exports = {
  HostBalance,
  BalanceTransaction
};