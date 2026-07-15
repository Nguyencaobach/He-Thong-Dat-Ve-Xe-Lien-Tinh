const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * knexfile.js - Cấu hình Knex cho trip-service
 * Dùng CommonJS (require/module.exports) để nhất quán với toàn dự án.
 *
 * Lệnh chạy:
 *   npm run migrate  → Tạo bảng từ thư mục db/migrations/
 *   npm run seed     → Chèn dữ liệu mẫu từ thư mục db/seeds/
 *   npm run rollback → Hoàn tác migration gần nhất
 */
module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'trip_db',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
  },
};
