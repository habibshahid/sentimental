# Sentiment Analysis Dashboard - Backend Implementation

## Overview

This project provides a backend implementation for a sentiment analysis dashboard that connects to:
1. **MongoDB** - Stores message data with sentiment analysis information
2. **MySQL** - Stores channel and queue metadata

## Project Structure

```
├── server.js           # Main entry point
├── .env                # Environment configuration
├── models/
│   └── Message.js      # MongoDB message model
├── db/
│   ├── mongodb.js      # MongoDB data access functions
│   └── mysql.js        # MySQL data access functions
├── routes/
│   └── index.js        # API route definitions
└── package.json        # Node.js dependencies
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install express mongoose mysql2 cors dotenv
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```
# Server Configuration
PORT=5000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/sentiment_analysis
MONGODB_MESSAGES_COLLECTION=messages

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=sentiment_dashboard
```

### 3. Set Up MySQL Database

Run the SQL script to create the necessary tables:

```bash
mysql -u your_username -p < simplified-mysql-schema.sql
```

### 4. Start the Server

```bash
node server.js
```

## API Endpoints

### Channel and Queue Information

- `GET /api/channels` - Get all channels from MySQL
- `GET /api/queues` - Get all queues from MySQL

### Message and Sentiment Data

- `GET /api/messages` - Get messages with filtering and pagination
- `GET /api/sentiment/stats` - Get sentiment statistics
- `GET /api/sentiment/by-channel` - Get sentiment breakdown by channel
- `GET /api/sentiment/by-day` - Get sentiment breakdown by day
- `GET /api/language/distribution` - Get language distribution
- `GET /api/profanity/stats` - Get profanity statistics
- `GET /api/intents/distribution` - Get intents distribution

### Dashboard Data

- `GET /api/dashboard` - Get all dashboard data in a single call

## Query Parameters

All endpoints that fetch MongoDB data support the following query parameters:

- `channel` - Filter by channel name
- `queue` - Filter by queue name
- `sentiment` - Filter by sentiment type (positive, neutral, negative)
- `startDate` - Start date for date range (ISO format)
- `endDate` - End date for date range (ISO format)
- `hasProfanity` - Filter for messages with profanity ('true' or 'false')
- `intent` - Filter by intent type
- `language` - Filter by language
- `author` - Filter by author name (partial match)
- `direction` - Filter by message direction (0 for inbound, 1 for outbound)
- `page` - Page number for pagination
- `limit` - Number of records per page

## Frontend Integration

This backend is designed to work with the React-based sentiment analysis dashboard. The frontend will need to make API calls to these endpoints to fetch the data for display.

## Next Steps

1. Ensure your MongoDB contains messages with the right schema structure
2. Configure the frontend API service to connect to these endpoints
3. Deploy the backend to your production environment

For more information or assistance, please contact the development team.