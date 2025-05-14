require('dotenv').config();
const mongoose = require('mongoose');

// Schema for request analytics
const RequestSchema = new mongoose.Schema({
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
  text: {
    type: String,
    required: false
  },
  model: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: false
  },
  sentiment: {
    score: Number,
    sentiment: String
  },
  intents: [String],
  profanity: {
    score: Number,
    words: [String]
  },
  usage: {
    prompt_tokens: Number,
    completion_tokens: Number,
    total_tokens: Number
  },
  cost: {
    inputCost: Number,
    outputCost: Number,
    totalCost: Number,
    inputPrice: Number,
    outputPrice: Number,
    totalPrice: Number,
    currency: String
  },
  cached: {
    type: Boolean,
    default: false
  },
  responseTime: Number, // in milliseconds
  // Additional fields for hourly/daily aggregation
  hour: {
    type: String,
    index: true
  },
  day: {
    type: String,
    index: true
  },
  month: {
    type: String,
    index: true
  },
  year: {
    type: String,
    index: true
  }
});

// Create an index for time-based queries
RequestSchema.index({ host: 1, timestamp: 1 });
RequestSchema.index({ host: 1, day: 1 });
RequestSchema.index({ host: 1, month: 1 });
RequestSchema.index({ host: 1, model: 1 });

// Schema for aggregated daily stats
const DailyStatsSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  year: Number,
  month: Number,
  day: Number,
  requests: {
    type: Number,
    default: 0
  },
  cacheHits: {
    type: Number,
    default: 0
  },
  cacheMisses: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  inputTokens: {
    type: Number,
    default: 0
  },
  outputTokens: {
    type: Number,
    default: 0
  },
  cost: {
    type: Number,
    default: 0
  },
  costSaved: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  priceSaved: {
    type: Number,
    default: 0
  },
  modelUsage: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  languages: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  sentimentDistribution: {
    positive: {
      type: Number,
      default: 0
    },
    neutral: {
      type: Number,
      default: 0
    },
    negative: {
      type: Number,
      default: 0
    }
  },
  intentDistribution: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  averageResponseTime: {
    type: Number,
    default: 0
  }
});

// Create a compound index for efficient retrieval
DailyStatsSchema.index({ host: 1, date: 1 }, { unique: true });
DailyStatsSchema.index({ host: 1, year: 1, month: 1 });

// Schema for aggregated hourly stats
const HourlyStatsSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  hour: {
    type: Number,
    required: true
  },
  datetime: {
    type: Date,
    required: true
  },
  requests: {
    type: Number,
    default: 0
  },
  cacheHits: {
    type: Number,
    default: 0
  },
  cacheMisses: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  cost: {
    type: Number,
    default: 0
  },
  costSaved: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  priceSaved: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number,
    default: 0
  }
});

// Create a compound index for efficient retrieval
HourlyStatsSchema.index({ host: 1, date: 1, hour: 1 }, { unique: true });

// Host-specific counter schema
const HostStatsSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true,
    unique: true
  },
  totalRequests: {
    type: Number,
    default: 0
  },
  cacheHits: {
    type: Number,
    default: 0
  },
  cacheMisses: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  inputTokens: {
    type: Number,
    default: 0
  },
  outputTokens: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  costSaved: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  priceSaved: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Create the models
const Request = mongoose.model('Request', RequestSchema);
const DailyStats = mongoose.model('DailyStats', DailyStatsSchema);
const HourlyStats = mongoose.model('HourlyStats', HourlyStatsSchema);
const HostStats = mongoose.model('HostStats', HostStatsSchema);

module.exports = {
  Request,
  DailyStats,
  HourlyStats,
  HostStats
};