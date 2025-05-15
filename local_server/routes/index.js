// routes/index.js - Simplified API routes
const express = require('express');
const router = express.Router();
const mysqlHelpers = require('../db/mysql');
const mongoHelpers = require('../db/mongodb');

// Get all channels from MySQL
router.get('/channels', async (req, res) => {
  try {
    const channels = await mysqlHelpers.getChannels(req.mysqlConnection);
    res.json(channels);
  } catch (error) {
    console.error('Error in /channels route:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get all queues from MySQL
router.get('/queues', async (req, res) => {
  try {
    const queues = await mysqlHelpers.getQueues(req.mysqlConnection);
    res.json(queues);
  } catch (error) {
    console.error('Error in /queues route:', error);
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
});

// Get messages from MongoDB with filtering and pagination
router.get('/messages', async (req, res) => {
  try {
    const filters = {
      channel: req.query.channel,
      queue: req.query.queue,
      sentiment: req.query.sentiment,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      hasProfanity: req.query.hasProfanity,
      intent: req.query.intent,
      language: req.query.language,
      author: req.query.author,
      direction: req.query.direction
    };
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await mongoHelpers.getMessages(filters, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error in /messages route:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get sentiment statistics from MongoDB
router.get('/sentiment/stats', async (req, res) => {
  try {
    const filters = {
      channel: req.query.channel,
      queue: req.query.queue,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const stats = await mongoHelpers.getSentimentStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('Error in /sentiment/stats route:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment statistics' });
  }
});

// Get sentiment by channel from MongoDB
router.get('/sentiment/by-channel', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const channelData = await mongoHelpers.getSentimentByChannel(filters);
    res.json(channelData);
  } catch (error) {
    console.error('Error in /sentiment/by-channel route:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment by channel' });
  }
});

// Get sentiment by day from MongoDB
router.get('/sentiment/by-day', async (req, res) => {
  try {
    const filters = {
      channel: req.query.channel,
      queue: req.query.queue,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const days = parseInt(req.query.days) || 30;
    
    const dayData = await mongoHelpers.getSentimentByDay(filters, days);
    res.json(dayData);
  } catch (error) {
    console.error('Error in /sentiment/by-day route:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment by day' });
  }
});

// Get language distribution from MongoDB
router.get('/language/distribution', async (req, res) => {
  try {
    const filters = {
      channel: req.query.channel,
      queue: req.query.queue,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const languageData = await mongoHelpers.getLanguageDistribution(filters);
    res.json(languageData);
  } catch (error) {
    console.error('Error in /language/distribution route:', error);
    res.status(500).json({ error: 'Failed to fetch language distribution' });
  }
});

// Get profanity statistics from MongoDB
router.get('/profanity/stats', async (req, res) => {
  try {
    const filters = {
      channel: req.query.channel,
      queue: req.query.queue,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const profanityStats = await mongoHelpers.getProfanityStats(filters);
    res.json(profanityStats);
  } catch (error) {
    console.error('Error in /profanity/stats route:', error);
    res.status(500).json({ error: 'Failed to fetch profanity statistics' });
  }
});

// Get intents distribution from MongoDB
router.get('/intents/distribution', async (req, res) => {
  try {
    const filters = {
      channel: req.query.channel,
      queue: req.query.queue,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const intentsData = await mongoHelpers.getIntentsDistribution(filters);
    res.json(intentsData);
  } catch (error) {
    console.error('Error in /intents/distribution route:', error);
    res.status(500).json({ error: 'Failed to fetch intents distribution' });
  }
});

// Get dashboard data (combines multiple endpoints for efficiency)
router.get('/dashboard', async (req, res) => {
  try {
    const filters = {
      channel: req.query.channel,
      queue: req.query.queue,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    // Run all queries in parallel for better performance
    const [
      sentiment,
      channelData,
      dayData,
      languageData,
      profanityStats,
      intentsData,
      channels,
      queues
    ] = await Promise.all([
      mongoHelpers.getSentimentStats(filters),
      mongoHelpers.getSentimentByChannel(filters),
      mongoHelpers.getSentimentByDay(filters),
      mongoHelpers.getLanguageDistribution(filters),
      mongoHelpers.getProfanityStats(filters),
      mongoHelpers.getIntentsDistribution(filters),
      mysqlHelpers.getChannels(req.mysqlConnection),
      mysqlHelpers.getQueues(req.mysqlConnection)
    ]);
    
    res.json({
      sentiment,
      channelData,
      dayData,
      languageData,
      profanityStats,
      intentsData,
      channels,
      queues
    });
  } catch (error) {
    console.error('Error in /dashboard route:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;