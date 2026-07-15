/**
 * db.js - Kết nối Knex đến PostgreSQL (admin_db)
 */
const knex = require('knex');
const knexConfig = require('../knexfile');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env]);

db.raw('SELECT 1')
  .then(() => console.log('[admin-service] ✓ Kết nối PostgreSQL (admin_db) thành công'))
  .catch((err) => console.error('[admin-service] ✗ Không thể kết nối PostgreSQL (admin_db):', err.message));

module.exports = db;
