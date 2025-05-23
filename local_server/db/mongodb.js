// db/mongodb.js - MongoDB helper functions (simplified)
const Message = require('../models/Message');
const mongoose = require('mongoose');

/**
 * Get messages with various filters
 * @param {Object} filters - Query filters
 * @param {string} filters.channel - Channel name
 * @param {string} filters.queue - Queue name
 * @param {string} filters.sentiment - Sentiment type (positive, neutral, negative)
 * @param {Date} filters.startDate - Start date
 * @param {Date} filters.endDate - End date
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of records per page
 * @returns {Promise<Object>} - Messages and pagination info
 */
async function getMessages(filters = {}, page = 1, limit = 100) {
  try {
    const query = buildQueryFromFilters(filters);
    query['author.role'] = { $ne: 'system' };
    query['messageType'] = { $nin: ['multimedia', 'notification'] };
    // Add filter to exclude specific roles if requested
    if (filters.excludeRole) {
      query['author.role'] = { $ne: filters.excludeRole };
    }
    
    // Pagination
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Message.countDocuments(query);
    
    return {
      messages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Get sentiment statistics
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} - Sentiment statistics
 */
async function getSentimentStats(filters = {}) {
  try {
    const query = buildQueryFromFilters(filters);
    
    // Exclude system messages if processing sentiment
    query['author.role'] = { $ne: 'system' };
    query['messageType'] = { $nin: ['multimedia', 'notification'] };

    // Aggregate sentiment counts
    const sentimentResults = await Message.aggregate([
      { $match: query },
      { 
        $group: {
          _id: "$extraPayload.sentimentAnalysis.sentiment.sentiment",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Calculate average sentiment score
    const avgScoreResult = await Message.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          averageScore: { $avg: "$extraPayload.sentimentAnalysis.sentiment.score" }
        }
      }
    ]);
    
    // Count total messages
    const totalMessages = await Message.countDocuments(query);
    
    // Format results
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0
    };
    
    sentimentResults.forEach(result => {
      if (result._id in sentimentCounts) {
        sentimentCounts[result._id] = result.count;
      }
    });
    
    const averageScore = avgScoreResult.length > 0 ? avgScoreResult[0].averageScore : 0;
    
    // Generate radar chart data for sentiment metrics
    const radarData = [
      { subject: 'Positive Messages', A: sentimentCounts.positive, fullMark: totalMessages },
      { subject: 'Customer Satisfaction', A: (averageScore + 1) * 50, fullMark: 100 }, // Normalize to 0-100
      { subject: 'Negative Messages', A: sentimentCounts.negative, fullMark: totalMessages },
      { subject: 'Neutral Messages', A: sentimentCounts.neutral, fullMark: totalMessages }
    ];
    
    return {
      distribution: [
        { name: 'Positive', value: sentimentCounts.positive, color: '#52c41a' },
        { name: 'Neutral', value: sentimentCounts.neutral, color: '#1890ff' },
        { name: 'Negative', value: sentimentCounts.negative, color: '#f5222d' }
      ],
      averageScore,
      total: totalMessages,
      radarData
    };
  } catch (error) {
    console.error('Error fetching sentiment statistics:', error);
    throw error;
  }
}

/**
 * Get sentiment breakdown by channel
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} - Sentiment breakdown by channel
 */
async function getSentimentByChannel(filters = {}) {
  try {
    const query = buildQueryFromFilters(filters);
    
    query['author.role'] = { $ne: 'system' };
    query['messageType'] = { $nin: ['multimedia', 'notification'] };

    const results = await Message.aggregate([
      { $match: query },
      { 
        $group: {
          _id: {
            channel: "$channel",
            sentiment: "$extraPayload.sentimentAnalysis.sentiment.sentiment"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.channel",
          sentiments: {
            $push: {
              sentiment: "$_id.sentiment",
              count: "$count"
            }
          },
          total: { $sum: "$count" }
        }
      }
    ]);
    
    // Format results
    return results.map(item => {
      const data = {
        name: item._id,
        total: item.total,
        positive: 0,
        neutral: 0,
        negative: 0
      };
      
      item.sentiments.forEach(s => {
        if (s.sentiment in data) {
          data[s.sentiment] = s.count;
        }
      });
      
      return data;
    });
  } catch (error) {
    console.error('Error fetching sentiment by channel:', error);
    throw error;
  }
}

/**
 * Get sentiment breakdown by day
 * @param {Object} filters - Query filters
 * @param {number} days - Number of days to include (default: 30)
 * @returns {Promise<Array>} - Sentiment breakdown by day
 */
async function getSentimentByDay(filters = {}, days = 30) {
  try {
    // Ensure we have a date range in the query
    const query = { ...buildQueryFromFilters(filters) };
    
    query['author.role'] = { $ne: 'system' };
    query['messageType'] = { $nin: ['multimedia', 'notification'] };

    // Default to last 30 days if no date range specified
    if (!query.createdAt) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const results = await Message.aggregate([
      { $match: query },
      {
        $addFields: {
          dateString: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          }
        }
      },
      { 
        $group: {
          _id: {
            date: "$dateString",
            sentiment: "$extraPayload.sentimentAnalysis.sentiment.sentiment"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          sentiments: {
            $push: {
              sentiment: "$_id.sentiment",
              count: "$count"
            }
          },
          total: { $sum: "$count" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Format results
    return results.map(item => {
      const data = {
        date: item._id,
        total: item.total,
        positive: 0,
        neutral: 0,
        negative: 0
      };
      
      item.sentiments.forEach(s => {
        if (s.sentiment in data) {
          data[s.sentiment] = s.count;
        }
      });
      
      return data;
    });
  } catch (error) {
    console.error('Error fetching sentiment by day:', error);
    throw error;
  }
}

/**
 * Get language distribution
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} - Language distribution
 */
async function getLanguageDistribution(filters = {}) {
  try {
    const query = buildQueryFromFilters(filters);
    
    query['author.role'] = { $ne: 'system' };
    query['messageType'] = { $nin: ['multimedia', 'notification'] };

    const results = await Message.aggregate([
      { $match: query },
      { 
        $group: {
          _id: "$extraPayload.sentimentAnalysis.language",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Generate colors for languages
    const colors = {
      english: '#722ed1',
      spanish: '#eb2f96',
      french: '#fa8c16',
      german: '#13c2c2',
      unknown: '#bfbfbf'
    };
    
    // Format results
    return results.map(item => ({
      name: item._id || 'unknown',
      value: item.count,
      color: colors[item._id] || `#${Math.floor(Math.random()*16777215).toString(16)}`
    }));
  } catch (error) {
    console.error('Error fetching language distribution:', error);
    throw error;
  }
}

/**
 * Get profanity statistics
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} - Profanity statistics
 */
async function getProfanityStats(filters = {}) {
  try {
    const query = buildQueryFromFilters(filters);
    
    query['author.role'] = { $ne: 'system' };
    query['messageType'] = { $nin: ['multimedia', 'notification'] };

    // Count total messages
    const totalMessages = await Message.countDocuments(query);
    
    // Count messages with profanity
    const profanityQuery = {
      ...query,
      'extraPayload.sentimentAnalysis.profanity.score': { $gt: 0 }
    };
    
    const messagesWithProfanity = await Message.countDocuments(profanityQuery);
    
    // Get average profanity score
    const avgScoreResult = await Message.aggregate([
      { $match: profanityQuery },
      {
        $group: {
          _id: null,
          averageScore: { $avg: "$extraPayload.sentimentAnalysis.profanity.score" }
        }
      }
    ]);
    
    const avgProfanityScore = avgScoreResult.length > 0 ? avgScoreResult[0].averageScore : 0;
    
    // Get top profane words
    const topWordsResult = await Message.aggregate([
      { $match: profanityQuery },
      { $unwind: "$extraPayload.sentimentAnalysis.profanity.words" },
      {
        $group: {
          _id: "$extraPayload.sentimentAnalysis.profanity.words",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const topWords = topWordsResult.map(item => ({
      word: item._id,
      count: item.count
    }));
    
    return {
      percentage: (messagesWithProfanity / totalMessages) * 100,
      avgScore: avgProfanityScore,
      topWords,
      messagesWithProfanity,
      totalMessages
    };
  } catch (error) {
    console.error('Error fetching profanity statistics:', error);
    throw error;
  }
}

/**
 * Get intents distribution
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} - Intents distribution
 */
async function getIntentsDistribution(filters = {}) {
  try {
    const query = buildQueryFromFilters(filters);
    
    query['author.role'] = { $ne: 'system' };
    query['messageType'] = { $nin: ['multimedia', 'notification'] };
    
    // Ensure intents array exists and is not empty
    const intentQuery = {
      ...query,
      'extraPayload.sentimentAnalysis.intents': { $exists: true, $ne: [] }
    };
    
    const results = await Message.aggregate([
      { $match: intentQuery },
      { $unwind: "$extraPayload.sentimentAnalysis.intents" },
      {
        $group: {
          _id: "$extraPayload.sentimentAnalysis.intents",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Format results
    return results.map(item => ({
      name: item._id,
      value: item.count
    }));
  } catch (error) {
    console.error('Error fetching intents distribution:', error);
    throw error;
  }
}

/**
 * Build MongoDB query from filter parameters
 * @param {Object} filters - Filter parameters
 * @returns {Object} - MongoDB query object
 */
function buildQueryFromFilters(filters) {
  const query = {};
  
  if (filters.channel) {
    query.channel = filters.channel;
  }
  
  if (filters.queue) {
    query.queue = filters.queue;
  }
  
  if (filters.sentiment) {
    query['extraPayload.sentimentAnalysis.sentiment.sentiment'] = filters.sentiment;
  }
  
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }
  
  // For profanity filter
  if (filters.hasProfanity === 'true') {
    query['extraPayload.sentimentAnalysis.profanity.score'] = { $gt: 0 };
  } else if (filters.hasProfanity === 'false') {
    query['extraPayload.sentimentAnalysis.profanity.score'] = 0;
  }
  
  // For intent filter
  if (filters.intent) {
    query['extraPayload.sentimentAnalysis.intents'] = filters.intent;
  }
  
  // For language filter
  if (filters.language) {
    query['extraPayload.sentimentAnalysis.language'] = filters.language;
  }
  
  // For author filter
  if (filters.author) {
    query['author.name'] = { $regex: filters.author, $options: 'i' };
  }
  
  // For direction filter
  if (filters.direction !== undefined) {
    query.direction = parseInt(filters.direction);
  }
  
  // For role filter - we typically want to exclude system messages
  if (filters.role) {
    query['author.role'] = filters.role;
  }
  
  return query;
}

module.exports = {
  getMessages,
  getSentimentStats,
  getSentimentByChannel,
  getSentimentByDay,
  getLanguageDistribution,
  getProfanityStats,
  getIntentsDistribution
};