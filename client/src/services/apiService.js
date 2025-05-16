// src/services/apiService.js - Updated with safe error handling
import axios from 'axios';

// API base URL - should be configured in .env file
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with defaults
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  // Add a longer timeout for potentially slow requests
  timeout: 30000
});

// Handle HTTP errors better
const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('API Error Response:', error.response.status, error.response.data);
    return Promise.reject(error.response.data.error || `Server error: ${error.response.status}`);
  } else if (error.request) {
    // The request was made but no response was received
    console.error('API No Response:', error.request);
    return Promise.reject('No response from server. Please check your network connection.');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('API Request Error:', error.message);
    return Promise.reject(`Request failed: ${error.message}`);
  }
};

// API Service Methods
const apiService = {
  /**
   * Get all channels
   * @returns {Promise<Array>} List of channels
   */
  getChannels: async () => {
    try {
      const response = await apiClient.get('/channels');
      return response.data || [];
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get all queues
   * @returns {Promise<Array>} List of queues
   */
  getQueues: async () => {
    try {
      const response = await apiClient.get('/queues');
      return response.data || [];
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get messages with filters and pagination
   * @param {Object} filters - Filter parameters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Messages and pagination info
   */
  getMessages: async (filters = {}, page = 1, limit = 10) => {
    try {
      const response = await apiClient.get('/messages', {
        params: {
          ...filters,
          page,
          limit
        }
      });
      return {
        messages: response.data?.messages || [],
        pagination: response.data?.pagination || { total: 0, page, limit, pages: 0 }
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get sentiment statistics
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Sentiment statistics
   */
  getSentimentStats: async (filters = {}) => {
    try {
      const response = await apiClient.get('/sentiment/stats', {
        params: filters
      });
      return response.data || { distribution: [], averageScore: 0, total: 0 };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get sentiment breakdown by channel
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Sentiment breakdown by channel
   */
  getSentimentByChannel: async (filters = {}) => {
    try {
      const response = await apiClient.get('/sentiment/by-channel', {
        params: filters
      });
      return response.data || [];
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get sentiment breakdown by day
   * @param {Object} filters - Filter parameters
   * @param {number} days - Number of days to include
   * @returns {Promise<Array>} Sentiment breakdown by day
   */
  getSentimentByDay: async (filters = {}, days = 30) => {
    try {
      const response = await apiClient.get('/sentiment/by-day', {
        params: {
          ...filters,
          days
        }
      });
      return response.data || [];
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get language distribution
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Language distribution
   */
  getLanguageDistribution: async (filters = {}) => {
    try {
      const response = await apiClient.get('/language/distribution', {
        params: filters
      });
      return response.data || [];
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get profanity statistics
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Profanity statistics
   */
  getProfanityStats: async (filters = {}) => {
    try {
      const response = await apiClient.get('/profanity/stats', {
        params: filters
      });
      return response.data || { 
        percentage: 0, 
        avgScore: 0, 
        topWords: [], 
        messagesWithProfanity: 0,
        totalMessages: 0
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get intents distribution
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Intents distribution
   */
  getIntentsDistribution: async (filters = {}) => {
    try {
      const response = await apiClient.get('/intents/distribution', {
        params: filters
      });
      return response.data || [];
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get all dashboard data in a single call
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} All dashboard data
   */
  getDashboardData: async (filters = {}) => {
    try {
      const response = await apiClient.get('/dashboard', {
        params: filters
      });
      
      // Ensure data has the expected structure with defaults
      return {
        sentiment: response.data?.sentiment || { distribution: [], averageScore: 0, radarData: [], total: 0 },
        channelData: response.data?.channelData || [],
        dayData: response.data?.dayData || [],
        languageData: response.data?.languageData || [],
        profanityStats: response.data?.profanityStats || { 
          percentage: 0, 
          avgScore: 0, 
          topWords: [], 
          messagesWithProfanity: 0,
          totalMessages: 0 
        },
        intentsData: response.data?.intentsData || [],
        channels: response.data?.channels || [],
        queues: response.data?.queues || []
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get current balance information for the host
   * @returns {Promise<Object>} Balance information
   */
  getCurrentBalance: async () => {
    try {
      // Get hostname from the window location
      const hostname = window.location.hostname;
      
      // Create API URL with the hostname as query parameter
      const apiUrl = `${process.env.REACT_APP_SENTIMENT_BALANCE_URL || 'http://localhost:5000/api'}/balance`;

      const response = await axios.get(apiUrl, {
        params: { host: hostname }
      });
      
      // If the API call is successful, return the data
      if (response.data && response.data.success) {
        return {
          balance: response.data.balance || 0,
          totalCreditsAdded: response.data.totalCreditsAdded || 0,
          totalCreditsUsed: response.data.totalCreditsUsed || 0,
          lastUpdated: response.data.lastUpdated,
          active: response.data.active || false,
          hostExists: response.data.hostExists || false,
          error: null
        };
      } else {
        // If the API returns success: false
        return {
          balance: 0,
          totalCreditsAdded: 0,
          totalCreditsUsed: 0,
          lastUpdated: null,
          active: false,
          hostExists: false,
          error: response.data.message || 'Unknown error'
        };
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      return {
        balance: 0,
        totalCreditsAdded: 0,
        totalCreditsUsed: 0,
        lastUpdated: null,
        active: false,
        hostExists: false,
        error: error.message || 'Failed to fetch balance'
      };
    }
  }
};

export default apiService;