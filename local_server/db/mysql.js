// db/mysql.js - Simplified MySQL helper functions
const mysql = require('mysql2/promise');

/**
 * Get all channels from MySQL database
 * @param {mysql.Connection} connection - MySQL database connection
 * @returns {Promise<Array>} - List of channels
 */
async function getChannels(connection) {
  try {
    const [rows] = await connection.execute(
      'SELECT id, channel FROM yovo_tbl_channels WHERE status = 1'
    );
    return rows;
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
}

/**
 * Get all queues from MySQL database
 * @param {mysql.Connection} connection - MySQL database connection
 * @returns {Promise<Array>} - List of queues
 */
async function getQueues(connection) {
  try {
    const [rows] = await connection.execute(
      'SELECT id, name FROM yovo_tbl_queues WHERE deleted = 0'
    );
    return rows;
  } catch (error) {
    console.error('Error fetching queues:', error);
    throw error;
  }
}

/**
 * Get channel by ID
 * @param {mysql.Connection} connection - MySQL database connection
 * @param {number} id - Channel ID
 * @returns {Promise<Object>} - Channel details
 */
async function getChannelById(connection, id) {
  try {
    const [rows] = await connection.execute(
      'SELECT id, channel FROM yovo_tbl_channels WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching channel by ID:', error);
    throw error;
  }
}

/**
 * Get queue by ID
 * @param {mysql.Connection} connection - MySQL database connection
 * @param {number} id - Queue ID
 * @returns {Promise<Object>} - Queue details
 */
async function getQueueById(connection, id) {
  try {
    const [rows] = await connection.execute(
      'SELECT id, name FROM yovo_tbl_queues WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching queue by ID:', error);
    throw error;
  }
}

module.exports = {
  getChannels,
  getQueues,
  getChannelById,
  getQueueById
};