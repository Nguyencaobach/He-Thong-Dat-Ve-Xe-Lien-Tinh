/**
 * health.js - Kiểm tra trạng thái admin-service
 */
const db = require('./db');

async function checkHealth() {
  try {
    await db.raw('SELECT 1');
    return { service: 'admin-service', status: 'ok', db: 'connected', timestamp: new Date().toISOString() };
  } catch (err) {
    return { service: 'admin-service', status: 'error', db: err.message, timestamp: new Date().toISOString() };
  }
}

module.exports = { checkHealth };
