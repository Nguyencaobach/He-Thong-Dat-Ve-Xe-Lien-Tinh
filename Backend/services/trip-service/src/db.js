/**
 * db.js - Kết nối Knex đến PostgreSQL (trip_db)
 *
 * Knex là query builder: giúp viết SQL an toàn, có migration, seed.
 * Khác với pg.Pool (raw SQL), Knex cung cấp thêm:
 *   - Migration system (tạo/rollback bảng theo version)
 *   - Seed system (chèn dữ liệu mẫu)
 *   - Query builder (tránh SQL injection)
 */
const knex = require('knex');
const knexConfig = require('../knexfile');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env]);

// Kiểm tra kết nối ngay khi module được load
db.raw('SELECT 1')
  .then(() => console.log('[trip-service] ✓ Kết nối PostgreSQL (trip_db) thành công'))
  .catch((err) => console.error('[trip-service] ✗ Không thể kết nối PostgreSQL (trip_db):', err.message));

module.exports = db;
