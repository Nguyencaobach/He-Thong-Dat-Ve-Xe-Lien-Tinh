const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * knexfile.js - Cấu hình Knex cho booking-service
 * DB: booking_db (Postgres)
 */
module.exports = {
  development: {
    client: 'pg',
    connection: {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5433,
      user:     process.env.DB_USER     || 'admin',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME     || 'booking_db',
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
