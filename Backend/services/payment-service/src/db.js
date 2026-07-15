/**
 * db.js - Kết nối Knex đến PostgreSQL (payment_db)
 */
const knex = require('knex');
const knexConfig = require('../knexfile');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env]);

db.raw('SELECT 1')
  .then(() => console.log('[payment-service] ✓ Kết nối PostgreSQL (payment_db) thành công'))
  .catch((err) => console.error('[payment-service] ✗ Không thể kết nối PostgreSQL (payment_db):', err.message));

module.exports = db;
