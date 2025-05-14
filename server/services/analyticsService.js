require('dotenv').config();
const mongoose = require('mongoose');
const { Request, DailyStats, HourlyStats, HostStats } = require('../models/analytics');

class AnalyticsService {
  constructor() {
    this.isConnected = false;
    this.mongodbAvailable = false; // Flag to check if MongoDB is available
    
    // Try to connect but don't fail the app if connection fails
    this.connect().catch(err => {
      console.error('Error initializing MongoDB connection:', err);
    });
  }

  async connect() {
    if (this.isConnected) return;

    try {
      // Check if MongoDB URI is defined
      const mongoURI = process.env.MONGODB_URI;
      
      if (!mongoURI) {
        console.warn('MongoDB URI is not defined in environment variables. Analytics functionality will be limited.');
        console.warn('Set MONGODB_URI in your .env file to enable analytics.');
        
        this.mongodbAvailable = false;
        return;
      }
      
      await mongoose.connect(mongoURI, {
        dbName: process.env.MONGODB_DB_NAME || 'sentiment_analysis',
      });
      
      console.log('Connected to MongoDB for analytics');
      this.isConnected = true;
      this.mongodbAvailable = true;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      this.mongodbAvailable = false;
      // Don't throw error - allow app to work without analytics
    }
  }

  // Record a new request with analytics data
  async recordRequest(data) {
    if (!data.host) {
      console.log('Host not provided, skipping analytics');
      return;
    }

    // Check if MongoDB is available
    if (!this.mongodbAvailable) {
      console.log('MongoDB not available, skipping analytics recording');
      return;
    }
    
    try {
      await this.connect();
      
      const startTime = Date.now();
      
      // Get date parts for aggregation
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const hour = now.getHours();
      
      const dateStr = `${year}-${month}-${day}`;
      const hourDatetime = new Date(year, now.getMonth(), now.getDate(), hour);
      
      // Create request record
      const request = new Request({
        host: data.host,
        timestamp: now,
        text: data.text ? data.text.substring(0, 100) : undefined, // Store partial text to avoid storage issues
        model: data.model,
        language: data.language,
        sentiment: data.sentiment,
        intents: data.intents,
        profanity: data.profanity,
        usage: data.usage,
        cost: data.cost,
        cached: data.cached,
        hour: `${dateStr}-${hour}`,
        day: dateStr,
        month: `${year}-${month}`,
        year: year
      });
      
      // Save request asynchronously - don't wait for this to complete
      request.save().catch(err => console.error('Error saving request record:', err));
      
      // Update daily stats using upsert
      const dailyUpdate = {
        $inc: {
          requests: 1,
          totalTokens: data.usage ? data.usage.total_tokens || 0 : 0,
          inputTokens: data.usage ? data.usage.prompt_tokens || 0 : 0,
          outputTokens: data.usage ? data.usage.completion_tokens || 0 : 0
        },
        $set: {
          year: parseInt(year),
          month: parseInt(month),
          day: parseInt(day)
        }
      };
      
      // Track cache stats
      if (data.cached) {
        dailyUpdate.$inc.cacheHits = 1;
        dailyUpdate.$inc.costSaved = data.cost ? data.cost.totalCost || 0 : 0;
        dailyUpdate.$inc.priceSaved = data.cost ? data.cost.totalPrice || 0 : 0;
      } else {
        dailyUpdate.$inc.cacheMisses = 1;
        dailyUpdate.$inc.cost = data.cost ? data.cost.totalCost || 0 : 0;
        dailyUpdate.$inc.price = data.cost ? data.cost.totalPrice || 0 : 0;
      }
      
      // Track model usage
      if (data.model) {
        dailyUpdate.$inc[`modelUsage.${data.model}`] = 1;
      }
      
      // Track language distribution
      if (data.language) {
        dailyUpdate.$inc[`languages.${data.language}`] = 1;
      }
      
      // Track sentiment distribution
      if (data.sentiment && data.sentiment.sentiment) {
        dailyUpdate.$inc[`sentimentDistribution.${data.sentiment.sentiment}`] = 1;
      }
      
      // Track intent distribution
      if (data.intents && Array.isArray(data.intents)) {
        for (const intent of data.intents) {
          dailyUpdate.$inc[`intentDistribution.${intent}`] = 1;
        }
      }
      
      // Calculate response time for completion
      const responseTime = Date.now() - startTime;
      dailyUpdate.$inc.averageResponseTime = responseTime;
      
      // Update daily stats
      await DailyStats.updateOne(
        { host: data.host, date: dateStr },
        dailyUpdate,
        { upsert: true }
      );
      
      // Update hourly stats
      const hourlyUpdate = {
        $inc: {
          requests: 1,
          totalTokens: data.usage ? data.usage.total_tokens || 0 : 0,
          averageResponseTime: responseTime
        },
        $set: {
          datetime: hourDatetime
        }
      };
      
      if (data.cached) {
        hourlyUpdate.$inc.cacheHits = 1;
        hourlyUpdate.$inc.costSaved = data.cost ? data.cost.totalCost || 0 : 0;
        hourlyUpdate.$inc.priceSaved = data.cost ? data.cost.totalPrice || 0 : 0;
      } else {
        hourlyUpdate.$inc.cacheMisses = 1;
        hourlyUpdate.$inc.cost = data.cost ? data.cost.totalCost || 0 : 0;
        hourlyUpdate.$inc.price = data.cost ? data.cost.totalPrice || 0 : 0;
      }
      
      await HourlyStats.updateOne(
        { host: data.host, date: dateStr, hour: hour },
        hourlyUpdate,
        { upsert: true }
      );
      
      // Update host counters
      const hostUpdate = {
        $inc: {
          totalRequests: 1,
          totalTokens: data.usage ? data.usage.total_tokens || 0 : 0,
          inputTokens: data.usage ? data.usage.prompt_tokens || 0 : 0,
          outputTokens: data.usage ? data.usage.completion_tokens || 0 : 0
        },
        $set: {
          lastUpdated: now
        }
      };
      
      if (data.cached) {
        hostUpdate.$inc.cacheHits = 1;
        hostUpdate.$inc.costSaved = data.cost ? data.cost.totalCost || 0 : 0;
        hostUpdate.$inc.priceSaved = data.cost ? data.cost.totalPrice || 0 : 0;
      } else {
        hostUpdate.$inc.cacheMisses = 1;
        hostUpdate.$inc.totalCost = data.cost ? data.cost.totalCost || 0 : 0;
        hostUpdate.$inc.totalPrice = data.cost ? data.cost.totalPrice || 0 : 0;
      }
      
      await HostStats.updateOne(
        { host: data.host },
        hostUpdate,
        { upsert: true }
      );
      
    } catch (error) {
      console.error('Error recording analytics:', error);
      // Don't throw - analytics errors shouldn't break the main functionality
    }
  }
  
  // Get aggregated analytics data for a specific host
  async getHostAnalytics(host) {
    // Check if MongoDB is available
    if (!this.mongodbAvailable) {
      console.log('MongoDB not available, returning empty analytics');
      return this.getEmptyAnalytics();
    }
    
    try {
      await this.connect();
      
      // Get host stats
      const hostStats = await HostStats.findOne({ host });
      
      if (!hostStats) {
        return this.getEmptyAnalytics();
      }
      
      // Get hourly data for the past 7 days
      const hourlyEndDate = new Date();
      const hourlyStartDate = new Date();
      hourlyStartDate.setDate(hourlyStartDate.getDate() - 7);
      
      const hourlyData = await HourlyStats.find({
        host,
        datetime: {
          $gte: hourlyStartDate,
          $lte: hourlyEndDate
        }
      }).sort({ datetime: 1 });
      
      const formattedHourlyData = hourlyData.map(item => {
        const hourLabel = `${item.date.split('-')[2]}-${item.hour}h`;
        return {
          hour: hourLabel,
          requests: item.requests,
          cacheHits: item.cacheHits || 0,
          cacheMisses: item.cacheMisses || 0,
          cost: parseFloat((item.cost || 0).toFixed(6)),
          price: parseFloat((item.price || 0).toFixed(6))
        };
      });
      
      // Get daily data for the past 30 days
      const dailyEndDate = new Date();
      const dailyStartDate = new Date();
      dailyStartDate.setDate(dailyStartDate.getDate() - 30);
      
      const dailyData = await DailyStats.find({
        host,
        year: { $gte: dailyStartDate.getFullYear() },
        month: { 
          $gte: dailyStartDate.getMonth() + 1,
          $lte: dailyEndDate.getMonth() + 1
        }
      }).sort({ date: 1 });
      
      const formattedDailyData = dailyData.map(item => {
        const parts = item.date.split('-');
        return {
          day: `${parts[1]}/${parts[2]}`,
          requests: item.requests,
          cacheHits: item.cacheHits || 0,
          cacheMisses: item.cacheMisses || 0,
          cost: parseFloat((item.cost || 0).toFixed(6)),
          price: parseFloat((item.price || 0).toFixed(6))
        };
      });
      
      // Get model usage distribution
      const modelDistribution = [];
      if (dailyData.length > 0) {
        const modelData = {};
        
        // Aggregate model usage from daily stats
        for (const day of dailyData) {
          if (!day.modelUsage) continue;
          
          for (const [model, count] of day.modelUsage.entries()) {
            modelData[model] = (modelData[model] || 0) + count;
          }
        }
        
        for (const [model, count] of Object.entries(modelData)) {
          modelDistribution.push({ model, count });
        }
      }
      
      // Calculate derived metrics
      const cacheHitRate = hostStats.totalRequests > 0 
        ? (hostStats.cacheHits / hostStats.totalRequests * 100).toFixed(2)
        : 0;
        
      const costSavingsRate = (hostStats.totalCost + hostStats.costSaved) > 0
        ? (hostStats.costSaved / (hostStats.totalCost + hostStats.costSaved) * 100).toFixed(2)
        : 0;
        
      const priceSavingsRate = (hostStats.totalPrice + hostStats.priceSaved) > 0
        ? (hostStats.priceSaved / (hostStats.totalPrice + hostStats.priceSaved) * 100).toFixed(2)
        : 0;
      
      return {
        summary: {
          totalRequests: hostStats.totalRequests,
          cacheHits: hostStats.cacheHits,
          cacheMisses: hostStats.cacheMisses,
          cacheHitRate: `${cacheHitRate}%`,
          totalCost: parseFloat(hostStats.totalCost.toFixed(6)),
          costSaved: parseFloat(hostStats.costSaved.toFixed(6)),
          costSavingsRate: `${costSavingsRate}%`,
          totalPrice: parseFloat(hostStats.totalPrice.toFixed(6)),
          priceSaved: parseFloat(hostStats.priceSaved.toFixed(6)),
          priceSavingsRate: `${priceSavingsRate}%`,
          inputTokens: hostStats.inputTokens,
          outputTokens: hostStats.outputTokens
        },
        hourlyData: formattedHourlyData,
        dailyData: formattedDailyData,
        modelUsage: modelDistribution
      };
    } catch (error) {
      console.error('Error fetching host analytics:', error);
      return this.getEmptyAnalytics();
    }
  }
  
  // Return empty analytics data when MongoDB is not available
  getEmptyAnalytics() {
    return {
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
    };
  }
  
  // Reset analytics for a specific host
  async resetHostAnalytics(host) {
    // Check if MongoDB is available
    if (!this.mongodbAvailable) {
      console.log('MongoDB not available, cannot reset analytics');
      return { success: false, message: 'MongoDB not available for analytics' };
    }
    
    try {
      await this.connect();
      
      // Delete all data for this host
      await Promise.all([
        Request.deleteMany({ host }),
        DailyStats.deleteMany({ host }),
        HourlyStats.deleteMany({ host }),
        HostStats.deleteMany({ host })
      ]);
      
      return { success: true, message: `Analytics data reset for host: ${host}` };
    } catch (error) {
      console.error('Error resetting host analytics:', error);
      return { success: false, message: `Error resetting analytics: ${error.message}` };
    }
  }
  
  // Clean up old analytics data for a specific host
  async cleanupHostAnalytics(host, daysToKeep = 30) {
    // Check if MongoDB is available
    if (!this.mongodbAvailable) {
      console.log('MongoDB not available, cannot cleanup analytics');
      return { success: false, message: 'MongoDB not available for analytics' };
    }
    
    try {
      await this.connect();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      // Delete old request records
      const requestsDeleted = await Request.deleteMany({ 
        host, 
        timestamp: { $lt: cutoffDate } 
      });
      
      // Delete old hourly stats
      const hourlyDeleted = await HourlyStats.deleteMany({ 
        host, 
        datetime: { $lt: cutoffDate } 
      });
      
      // Delete old daily stats
      const dailyCutoffStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;
      
      const dailyDeleted = await DailyStats.deleteMany({ 
        host, 
        date: { $lt: dailyCutoffStr } 
      });
      
      return { 
        success: true, 
        message: `Cleaned up analytics data older than ${daysToKeep} days for host: ${host}`,
        deleted: {
          requests: requestsDeleted.deletedCount,
          hourly: hourlyDeleted.deletedCount,
          daily: dailyDeleted.deletedCount
        }
      };
    } catch (error) {
      console.error('Error cleaning up host analytics:', error);
      return { success: false, message: `Error cleaning up analytics: ${error.message}` };
    }
  }
  
  // Get list of all hosts with analytics data
  async getAllHosts() {
    // Check if MongoDB is available
    if (!this.mongodbAvailable) {
      console.log('MongoDB not available, returning empty hosts list');
      return [];
    }
    
    try {
      await this.connect();
      
      const hosts = await HostStats.find({}, { host: 1, totalRequests: 1, lastUpdated: 1 })
        .sort({ totalRequests: -1 });
      
      return hosts.map(h => ({
        host: h.host,
        totalRequests: h.totalRequests,
        lastUpdated: h.lastUpdated
      }));
    } catch (error) {
      console.error('Error fetching all hosts:', error);
      return [];
    }
  }
}

module.exports = new AnalyticsService();