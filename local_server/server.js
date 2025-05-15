// server.js - Simplified version
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const routes = require('./routes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connections
let mongoConnection = null;
let mysqlConnection = null;

// MongoDB connection
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
    mongoConnection = mongoose.connection;
    return mongoConnection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// MySQL connection
async function connectToMySQL() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    console.log('Connected to MySQL');
    mysqlConnection = connection;
    return connection;
  } catch (error) {
    console.error('MySQL connection error:', error);
    process.exit(1);
  }
}

// Make connections available to routes
app.use((req, res, next) => {
  req.mongoConnection = mongoConnection;
  req.mysqlConnection = mysqlConnection;
  next();
});

// Routes
app.use('/api', routes);

// Start server
async function startServer() {
  try {
    await connectToMongoDB();
    await connectToMySQL();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;