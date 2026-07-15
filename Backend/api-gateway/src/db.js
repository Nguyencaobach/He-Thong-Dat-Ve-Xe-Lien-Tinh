/**
 * db.js - Kết nối đến PostgreSQL Database của API Gateway (users_db)
 *
 * Sử dụng pg.Pool để quản lý một "hồ" các kết nối tái sử dụng được,
 * thay vì mở-đóng kết nối mới cho mỗi truy vấn (tốn tài nguyên hơn).
 */

const { Pool } = require('pg');
require('dotenv').config();

// Tạo pool kết nối với thông tin từ biến môi trường (.env)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'users_db',
  // Số lượng kết nối tối đa trong pool
  max: 10,
  // Thời gian chờ tối đa (ms) để lấy kết nối từ pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Kiểm tra kết nối ngay khi server khởi động
pool.connect((err, client, release) => {
  if (err) {
    console.error('[api-gateway] ✗ Không thể kết nối PostgreSQL (users_db):', err.message);
    return;
  }
  release();
  console.log('[api-gateway] ✓ Kết nối PostgreSQL (users_db) thành công');
});

module.exports = pool;
