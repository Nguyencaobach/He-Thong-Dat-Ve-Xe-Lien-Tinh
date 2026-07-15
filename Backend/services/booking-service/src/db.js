/**
 * db.js - Kết nối Knex đến PostgreSQL (booking_db)
 */
const knex = require('knex');
const knexConfig = require('../knexfile');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env]);

db.raw('SELECT 1')
  .then(() => console.log('[booking-service] ✓ Kết nối PostgreSQL (booking_db) thành công'))
  .catch((err) => console.error('[booking-service] ✗ Không thể kết nối PostgreSQL (booking_db):', err.message));

module.exports = db;
