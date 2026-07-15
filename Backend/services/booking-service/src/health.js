/**
 * health.js - Kiểm tra trạng thái booking-service
 */
const db = require('./db');

async function checkHealth() {
  try {
    await db.raw('SELECT 1');
    return { service: 'booking-service', status: 'ok', db: 'connected', timestamp: new Date().toISOString() };
  } catch (err) {
    return { service: 'booking-service', status: 'error', db: err.message, timestamp: new Date().toISOString() };
  }
}

module.exports = { checkHealth };
