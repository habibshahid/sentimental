const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const Redis = require('ioredis');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
require('dotenv').config();

// Load analytics service
let analyticsService;
try {
  analyticsService = require('./services/analyticsService');
  console.log('Analytics service loaded successfully');
} catch (error) {
  console.error('Error loading analytics service:', error.message);
  // Create a dummy analytics service that does nothing
  analyticsService = {
    recordRequest: () => Promise.resolve(),
    getHostAnalytics: () => Promise.resolve({
      summary: {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheHitRate: '0%',
        totalCost: 0,
        costSaved: 0,
        costSavingsRate: '0%',
        totalPrice: 0,
        priceSaved: 0,
        priceSavingsRate: '0%',
        inputTokens: 0,
        outputTokens: 0
      },
      hourlyData: [],
      dailyData: [],
      modelUsage: [],
      mongodbNotAvailable: true
    }),
    resetHostAnalytics: () => Promise.resolve({ success: false, message: 'Analytics service not available' }),
    cleanupHostAnalytics: () => Promise.resolve({ success: false, message: 'Analytics service not available' }),
    getAllHosts: () => Promise.resolve([]),
    mongodbAvailable: false
  };
}

// Base path configuration
const BASE_PATH = process.env.BASE_PATH || '/sentiment';
const APP_PATH = normalizePath(BASE_PATH);

// OpenAI token pricing (per 1000 tokens) in USD
const tokenPricing = {
  'gpt-3.5-turbo-0125': { input: 0.0005, output: 0.0015 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
};

// Default model
const DEFAULT_MODEL = 'gpt-3.5-turbo-0125';

/**
 * Setup Express application with middleware
 */
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(`${APP_PATH}/static`, express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Set local variables for templates
app.use((req, res, next) => {
  res.locals.basePath = APP_PATH;
  next();
});

// Setup logging
setupLogging();

// Initialize Redis connection
const redis = initializeRedis();

// Setup session with Redis store
setupSession(redis);

// Apply rate limiting to API routes
setupRateLimiting();

/**
 * API Routes
 */

const ensureAuthenticated = (req, res, next) => {

  if (req.session.authenticated) {
    return next();
  }
  
  // If user is not authenticated, redirect to login page
  res.redirect('/sentiment/login');
};

// Main API endpoint for sentiment analysis
app.post(`/api/analyze`, async (req, res) => {
  try {
    const { text, model = DEFAULT_MODEL } = req.body;
    const host = req.body.host;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
	
	if (!host) {
      return res.status(400).json({ error: 'host is required. e.g. host.customer.com' });
    }
    
    const cleanedText = cleanString(text);
    const cacheKey = generateCacheKey(cleanedText, model);
    
    // Start measuring response time for analytics
    const startTime = Date.now();
    
    // Check cache first
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for: ${cacheKey}`);
      const result = JSON.parse(cachedResult);
      
      // Update analytics for cache hit
      if (host) {
        await updateAnalytics({ 
          host,
          text: cleanedText,
          model, 
          cached: true, 
          cost: result.cost,
          usage: result.usage,
          language: result.language,
          sentiment: result.sentiment,
          intents: result.intents,
          profanity: result.profanity,
          responseTime: Date.now() - startTime
        });
      }
      
      // Return cached result
      return res.json({
        ...result,
        cached: true
      });
    }
    
    // If not in cache, call OpenAI API
    console.log(`Cache miss for: ${cacheKey}`);
    
    // Prepare OpenAI request
    const openAIRequest = {
      model: model,
      messages: [
        {
          role: "system",
          content: "Generate a JSON object using RFC 8259 ONLY, no description required in response JUST JSON Object; DO NOT GENERATE ANY ADDITIONAL TEXT OTHER THAN THE JSON RESPONSE. and do the following \r\n 1. Detect language\r\n 2. sentiment analysis\r\n 2a. sentiment score\r\n 2b. sentiment value (negative, neutral, positive)\r\n 3. profanity score\r\n 4. identify profane words and add to array\r\n 5. identify intents and add to array. if the message is about an order then intent is order_status, if the intent is a complaint about an order then intent is order_status, new_complaint. if the intent is about an existing complaint then intent is complaint_status, if the message is asking about something then intent is information and classify all others in others. The response object should be like {sentiment:{score: value, sentiment: value}, profanity: {score: value, words:[]}, intents: [], language: value}"
        },
        {
          role: "user",
          content: cleanedText
        }
      ]
    };
    
    // Call OpenAI API
    const openAIResponse = await callOpenAI(openAIRequest);
    let result;
    
    try {
      // Parse the response content as JSON
      result = JSON.parse(openAIResponse.data.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return res.status(500).json({ error: 'Failed to parse OpenAI response' });
    }
    
    // Calculate costs
    const costInfo = calculateCost(openAIResponse.data.usage, model);
    
    // Combine original result with usage and cost information
    const finalResult = {
      ...result,
      usage: openAIResponse.data.usage,
      cost: costInfo,
      requestDetails: {
        model: model,
        timestamp: new Date().toISOString(),
        host: host
      }
    };
    
    // Determine appropriate TTL based on content
    const ttl = determineTTL(result);
    
    // Store in cache with appropriate TTL
    await redis.set(cacheKey, JSON.stringify(finalResult), 'EX', ttl);
    
    // Calculate final response time
    const responseTime = Date.now() - startTime;
    
    // Update analytics for cache miss
    if (host) {
      await updateAnalytics({ 
        host,
        text: cleanedText,
        model, 
        cached: false, 
        cost: costInfo,
        usage: openAIResponse.data.usage,
        language: result.language,
        sentiment: result.sentiment,
        intents: result.intents,
        profanity: result.profanity,
        responseTime
      });
    }
    
    // Return the final response
    return res.json(finalResult);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'An error occurred during analysis',
      details: error.response?.data || error.message
    });
  }
});

// Batch processing endpoint
app.post(`/api/batch`, async (req, res) => {
  const { texts, model = DEFAULT_MODEL } = req.body;
  const host = req.body.host || req.headers.host || 'default';
  
  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'Array of texts is required' });
  }
  
  if (texts.length > 100) {
    return res.status(400).json({ 
      error: 'Batch size too large. Maximum allowed is 100 texts.' 
    });
  }
  
  try {
    const promises = texts.map(text => processText(text, model, host));
    const batchResults = await Promise.all(promises);
    
    // Calculate batch summary statistics
    const batchSummary = calculateBatchSummary(batchResults);
    
    return res.json({
      summary: batchSummary,
      results: batchResults
    });
  } catch (error) {
    console.error('Batch processing error:', error);
    return res.status(500).json({ 
      error: 'An error occurred during batch processing',
      details: error.message
    });
  }
});

// Cache management endpoints
app.delete(`/api/cache`, ensureAuthenticated, async (req, res) => {
  const { key, pattern } = req.query;
  
  try {
    if (key) {
      // Delete specific key
      const deleted = await redis.del(key);
      return res.json({ 
        success: deleted > 0, 
        message: deleted > 0 ? 'Cache entry deleted' : 'Cache key not found' 
      });
    } else if (pattern) {
      // Delete by pattern
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        const deleted = await redis.del(keys);
        return res.json({ 
          success: true, 
          message: `Deleted ${deleted} cache entries matching pattern: ${pattern}` 
        });
      } else {
        return res.json({ 
          success: false, 
          message: `No cache entries found matching pattern: ${pattern}` 
        });
      }
    } else {
      // Flush cache (only cache keys, not analytics or sessions)
      const cacheKeys = await redis.keys('*');
      const nonSystemKeys = cacheKeys.filter(key => !key.startsWith('analytics') && !key.startsWith('session'));
      
      if (nonSystemKeys.length > 0) {
        await redis.del(nonSystemKeys);
        return res.json({ 
          success: true, 
          message: `Cleared ${nonSystemKeys.length} cache entries` 
        });
      } else {
        return res.json({ 
          success: true, 
          message: 'No cache entries to clear' 
        });
      }
    }
  } catch (error) {
    console.error('Error managing cache:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to manage cache',
      details: error.message 
    });
  }
});

// Get cache statistics
app.get(`/api/cache/stats`, ensureAuthenticated, async (req, res) => {
  try {
    // Get Redis memory stats
    const info = await redis.info('memory');
    const memoryStats = {};
    
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        memoryStats[key] = value;
      }
    });
    
    // Get cache key count
    const cacheKeys = await redis.keys('*');
    const nonSessionKeys = cacheKeys.filter(key => !key.startsWith('session:'));
    
    return res.json({
      keyCount: nonSessionKeys.length,
      memoryUsage: memoryStats.used_memory_human || 'Unknown',
      memoryPeak: memoryStats.used_memory_peak_human || 'Unknown',
      fragmentation: memoryStats.mem_fragmentation_ratio || 'Unknown',
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch cache statistics',
      details: error.message
    });
  }
});

// API endpoint to get analytics data
app.get(`/api/analytics`, ensureAuthenticated, async (req, res) => {
  try {
    // Extract host from query params or default to 'default'
    const host = req.query.host;
    
    // Get analytics data for this host
    const analytics = await analyticsService.getHostAnalytics(host);

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics data',
      mongodbNotAvailable: true
    });
  }
});

// Reset analytics data
app.delete(`/api/analytics`, ensureAuthenticated, async (req, res) => {
  try {
    // Extract host from query params or default to 'default'
    const host = req.query.host || req.headers.host || 'default';
    
    // Reset analytics for this host
    const result = await analyticsService.resetHostAnalytics(host);
    res.json(result);
  } catch (error) {
    console.error('Error resetting analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset analytics data',
      details: error.message 
    });
  }
});

// Cleanup old analytics data
app.post(`/api/analytics/cleanup`, ensureAuthenticated, async (req, res) => {
  try {
    const { olderThan } = req.body;
    const daysToKeep = parseInt(olderThan) || 30;
    const host = req.body.host || req.headers.host || 'default';
    
    // Cleanup old analytics for this host
    const result = await analyticsService.cleanupHostAnalytics(host, daysToKeep);
    
    res.json(result);
  } catch (error) {
    console.error('Error cleaning up analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clean up analytics data',
      details: error.message 
    });
  }
});

// Get list of all hosts with analytics
app.get(`/api/analytics/hosts`, ensureAuthenticated, async (req, res) => {
  try {
    const hosts = await analyticsService.getAllHosts();
    res.json({ hosts });
  } catch (error) {
    console.error('Error fetching hosts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch host list',
      details: error.message 
    });
  }
});

/**
 * Authentication & Dashboard Routes
 */

// Login page
app.get('/login', (req, res) => {
  // If already authenticated, redirect to dashboard
  
  if (req.session.authenticated) {
    return res.redirect('/sentiment/');
  }
  
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Check credentials
  if (
    username === process.env.DASHBOARD_USERNAME && 
    password === process.env.DASHBOARD_PASSWORD
  ) {
    // Set authenticated session
    req.session.authenticated = true;
    req.session.username = username;
    
    // Redirect to dashboard
    return res.redirect('/sentiment/');
  }
  
  // If credentials are invalid, show error
  res.render('login', { error: 'Invalid username or password' });
});

app.get('/logout', (req, res) => {
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/sentiment/login');
  });
});

// Dashboard routes
app.get('/', ensureAuthenticated, (req, res) => {
  res.render('dashboard', { 
    username: req.session.username || 'User'
  });
});

app.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    // Your existing dashboard route logic here
    const host = req.hostname;
    const analyticsData = await analyticsService.getHostAnalytics(host);
    
    res.render('dashboard', {
      title: 'Analytics Dashboard',
      user: req.user,
      analytics: analyticsData
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Ensure directories exist
ensureDirectoriesExist();

app.get('/api/docs', ensureAuthenticated, (req, res) => {
  const docs = {
    openapi: '3.0.0',
    info: {
      title: 'Sentiment Analysis API',
      description: 'API for analyzing text sentiment with caching and cost tracking',
      version: '1.0.0'
    },
    servers: [
      {
        url: `http://${req.headers.host}`,
        description: 'Current server'
      }
    ],
    paths: {
      '/api/analyze': {
        post: {
          summary: 'Analyze text sentiment',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['text'],
                  properties: {
                    text: {
                      type: 'string',
                      description: 'Text to analyze'
                    },
                    model: {
                      type: 'string',
                      description: 'OpenAI model to use',
                      default: DEFAULT_MODEL
                    },
                    host: {
                      type: 'string',
                      description: 'Optional host identifier'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      sentiment: {
                        type: 'object',
                        properties: {
                          score: { type: 'number' },
                          sentiment: { type: 'string' }
                        }
                      },
                      profanity: {
                        type: 'object',
                        properties: {
                          score: { type: 'number' },
                          words: { type: 'array', items: { type: 'string' } }
                        }
                      },
                      intents: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      language: { type: 'string' },
                      usage: { type: 'object' },
                      cost: { type: 'object' },
                      cached: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/batch': {
        post: {
          summary: 'Batch process multiple texts',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['texts'],
                  properties: {
                    texts: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Array of texts to analyze (max 100)'
                    },
                    model: {
                      type: 'string',
                      description: 'OpenAI model to use',
                      default: DEFAULT_MODEL
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful batch analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      summary: { type: 'object' },
                      results: { 
                        type: 'array',
                        items: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/cache/stats': {
        get: {
          summary: 'Get cache statistics',
          responses: {
            '200': {
              description: 'Cache statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object'
                  }
                }
              }
            }
          }
        }
      },
      '/api/analytics': {
        get: {
          summary: 'Get analytics data',
          responses: {
            '200': {
              description: 'Analytics data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object'
                  }
                }
              }
            }
          }
        }
      }
      // Additional endpoints documentation
    }
  };
  
  res.json(docs);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sentiment analysis service running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}${APP_PATH}`);
  console.log(`API documentation at http://localhost:${PORT}${APP_PATH}/api/docs`);
  console.log(`Login page at http://localhost:${PORT}${APP_PATH}/login`);
});

/**
 * Helper Functions
 */

// Normalize base path
function normalizePath(path) {
  let normalized = path;
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  if (normalized.endsWith('/') && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

// Set up logging
function setupLogging() {
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'), 
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
  app.use(morgan('dev'));
}

// Initialize Redis
function initializeRedis() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    username: process.env.REDIS_USERNAME || '',
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => {
      // Reconnection strategy
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redis.on('connect', () => console.log('Connected to Redis'));
  redis.on('error', (err) => console.error('Redis error:', err));
  
  return redis;
}

// Setup session with Redis store
function setupSession(redis) {
  app.use(session({
    store: new RedisStore({ 
      client: redis, 
      prefix: 'session:',
      // Default to 24 hour expiration if not specified in cookie maxAge
      ttl: 24 * 60 * 60
    }),
    secret: process.env.SESSION_SECRET || 'sentiment-analysis-secret',
    resave: false,
    saveUninitialized: false,
    name: 'sentiment.sid', // Custom cookie name for better security
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // Provides some CSRF protection
    }
  }));
}

// Setup rate limiting
function setupRateLimiting() {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100, // limit each IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests, please try again later.',
      retryAfter: 15 * 60 // seconds
    }
  });

  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: process.env.RATE_LIMIT_MAX / 2 || 50,
    delayMs: (hits) => hits * 100, // add 100ms delay per hit above threshold
  });

  app.use(`/api/`, apiLimiter);
  app.use(`/api/`, speedLimiter);
}

// Clean and normalize input text
function cleanString(text) {
  if (!text) return '';
  // Basic text cleaning - remove excessive whitespace, normalize quotes, etc.
  return text.trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

// Generate hash key for caching
function generateCacheKey(text, model) {
  const hash = crypto.createHash('md5');
  hash.update(`${text}|${model}`);
  return hash.digest('hex');
}

// Determine appropriate cache TTL based on content
function determineTTL(result) {
  // Default TTL in seconds
  const defaultTTL = process.env.CACHE_TTL || 86400; // 24 hours
  
  // Shorter TTL for time-sensitive content
  if (result.intents.includes('news') || result.intents.includes('current_events')) {
    return 3600; // 1 hour for news/current events
  }
  
  // Longer TTL for static/reference content
  if (result.intents.includes('factual') || result.intents.includes('reference')) {
    return 604800; // 1 week for factual/reference content
  }
  
  // Shorter TTL for negative content that might need addressing
  if (result.sentiment.sentiment === 'negative' && result.sentiment.score < -0.5) {
    return 43200; // 12 hours for strongly negative content
  }
  
  return defaultTTL;
}

// Calculate cost and price based on token usage
function calculateCost(usage, model) {
  const modelPricing = tokenPricing[model] || tokenPricing[DEFAULT_MODEL];
  
  const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
  const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
  const totalCost = inputCost + outputCost;
  const inputPrice = (inputCost * 0.25) + inputCost;
  const outputPrice = (outputCost * 0.25) + outputCost;
  const totalPrice = inputPrice + outputPrice;
  
  return {
    inputCost: parseFloat(inputCost.toFixed(6)),
    outputCost: parseFloat(outputCost.toFixed(6)),
    totalCost: parseFloat(totalCost.toFixed(6)),
    inputPrice: parseFloat(inputPrice.toFixed(6)),
    outputPrice: parseFloat(outputPrice.toFixed(6)),
    totalPrice: parseFloat(totalPrice.toFixed(6)),
    currency: 'USD'
  };
}

// Update analytics for a request
async function updateAnalytics(data) {
  if (!data.host) {
    console.log('Host not provided, skipping analytics tracking');
    return;
  }
  
  try {
    await analyticsService.recordRequest(data);
  } catch (error) {
    console.error('Error recording analytics:', error);
    // Continue - analytics errors shouldn't break the main functionality
  }
}

// Call OpenAI API
async function callOpenAI(requestData) {
  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.openai.com/v1/chat/completions',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    data: JSON.stringify(requestData)
  };
  
  return axios.request(config);
}

// Process a single text for batch processing
async function processText(text, model, host) {
  const cleanedText = cleanString(text);
  const cacheKey = generateCacheKey(cleanedText, model);
  const startTime = Date.now();
  
  // Check cache first
  const cachedResult = await redis.get(cacheKey);
  if (cachedResult) {
    const result = JSON.parse(cachedResult);
    
    // Update analytics for cache hit
    if (host) {
      await updateAnalytics({ 
        host,
        text: cleanedText,
        model, 
        cached: true, 
        cost: result.cost,
        usage: result.usage,
        language: result.language,
        sentiment: result.sentiment,
        intents: result.intents,
        profanity: result.profanity,
        responseTime: Date.now() - startTime
      });
    }
    
    return { ...result, cached: true };
  }
  
  // Call OpenAI API if not in cache
  const requestData = {
    model: model,
    messages: [
      {
        role: "system",
        content: "Generate a JSON object using RFC 8259 ONLY, no description required in response JUST JSON Object; DO NOT GENERATE ANY ADDITIONAL TEXT OTHER THAN THE JSON RESPONSE. and do the following \r\n 1. Detect language\r\n 2. sentiment analysis\r\n 2a. sentiment score\r\n 2b. sentiment value (negative, neutral, positive)\r\n 3. profanity score\r\n 4. identify profane words and add to array\r\n 5. identify intents and add to array. if the message is about an order then intent is order_status, if the intent is a complaint about an order then intent is order_status, new_complaint. if the intent is about an existing complaint then intent is complaint_status, if the message is asking about something then intent is information and classify all others in others. The response object should be like {sentiment:{score: value, sentiment: value}, profanity: {score: value, words:[]}, intents: [], language: value}"
      },
      {
        role: "user",
        content: cleanedText
      }
    ]
  };
  
  const openAIResponse = await callOpenAI(requestData);
  const result = JSON.parse(openAIResponse.data.choices[0].message.content);
  
  // Calculate costs
  const costInfo = calculateCost(openAIResponse.data.usage, model);
  
  // Prepare final result
  const finalResult = {
    ...result,
    usage: openAIResponse.data.usage,
    cost: costInfo,
    requestDetails: {
      model: model,
      timestamp: new Date().toISOString(),
      originalText: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    }
  };
  
  // Determine appropriate TTL and store in cache
  const ttl = determineTTL(result);
  await redis.set(cacheKey, JSON.stringify(finalResult), 'EX', ttl);
  
  // Calculate response time
  const responseTime = Date.now() - startTime;
  
  // Update analytics
  if (host) {
    await updateAnalytics({ 
      host,
      text: cleanedText,
      model, 
      cached: false, 
      cost: costInfo,
      usage: openAIResponse.data.usage,
      language: result.language,
      sentiment: result.sentiment,
      intents: result.intents,
      profanity: result.profanity,
      responseTime
    });
  }
  
  return finalResult;
}

// Calculate summary statistics for batch processing
function calculateBatchSummary(batchResults) {
  const summary = {
    totalTexts: batchResults.length,
    cached: batchResults.filter(r => r.cached).length,
    fresh: batchResults.filter(r => !r.cached).length,
    avgSentimentScore: batchResults.reduce((sum, r) => sum + r.sentiment.score, 0) / batchResults.length,
    totalCost: batchResults.reduce((sum, r) => sum + r.cost.totalCost, 0),
    totalPrice: batchResults.reduce((sum, r) => sum + r.cost.totalPrice, 0),
    profit: batchResults.reduce((sum, r) => sum + (r.cost.totalPrice - r.cost.totalCost), 0),
    sentimentBreakdown: {
      positive: batchResults.filter(r => r.sentiment.sentiment === 'positive').length,
      neutral: batchResults.filter(r => r.sentiment.sentiment === 'neutral').length,
      negative: batchResults.filter(r => r.sentiment.sentiment === 'negative').length
    },
    intents: {}
  };
  
  // Count intents across all results
  batchResults.forEach(r => {
    r.intents.forEach(intent => {
      summary.intents[intent] = (summary.intents[intent] || 0) + 1;
    });
  });
  
  return summary;
}

// Authentication middleware
const authenticate = (req, res, next) => {
  // Skip authentication for login page and related routes
  if (req.path === '/login' || req.path === '/favicon.ico') {
    return next();
  }
  
  // Check if user is authenticated
  if (req.session.authenticated) {
    return next();
  }
  
  // If not authenticated, redirect to login page
  res.redirect('/login');
};

app.use(authenticate);

// Ensure required directories exist
function ensureDirectoriesExist() {
  const viewsDir = path.join(__dirname, 'views');
  const publicDir = path.join(__dirname, 'public');

  if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir, { recursive: true });
  }

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
}