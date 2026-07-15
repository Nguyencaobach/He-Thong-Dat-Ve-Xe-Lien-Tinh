/**
 * redisClient.js - Kết nối Redis dùng chung cho toàn seat-service
 *
 * Tại sao seat-service chỉ dùng Redis, không dùng Postgres?
 * - Đặc tả yêu cầu: "Giữ ghế phải phản hồi dưới 1 giây"
 * - Redis thao tác In-Memory, tốc độ ~0.1ms vs Postgres ~5-10ms
 * - Cơ chế SETNX (SET if Not eXists) của Redis là atomic natively,
 *   không cần transaction phức tạp như Postgres để chống race condition
 *
 * Hai client Redis riêng biệt:
 * - redis: Dùng cho SETNX, GET, DEL (các lệnh thao tác dữ liệu ghế)
 * - redisSub: Dùng riêng cho SUBSCRIBE (không thể dùng chung vì Redis
 *   client khi đã vào chế độ SUBSCRIBE sẽ không nhận lệnh khác)
 */
const Redis = require('ioredis');
require('dotenv').config();

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  // lazyConnect: true => Kết nối khi dùng lần đầu, không crash ngay
  // nếu Redis chưa khởi động kịp khi service start
  lazyConnect: true,
  retryStrategy(times) {
    // Thử lại kết nối tối đa 10 lần, mỗi lần cách nhau 2 giây
    if (times > 10) {
      console.error('[seat-service] Không thể kết nối Redis sau 10 lần thử.');
      return null; // Dừng thử lại
    }
    return Math.min(times * 500, 2000);
  },
};

// ── Client chính: dùng cho tất cả lệnh đọc/ghi (SETNX, GET, DEL, SET) ────────
const redis = new Redis(REDIS_CONFIG);

redis.on('connect', () =>
  console.log('[seat-service] ✓ Redis (main) kết nối thành công')
);
redis.on('error', (err) =>
  console.warn('[seat-service] ✗ Redis (main) lỗi:', err.message)
);

// ── Client subscriber: chỉ dùng cho keyspace notification (lắng nghe TTL hết hạn) ──
// Phải là client riêng biệt vì khi gọi SUBSCRIBE, client chỉ nhận được message,
// không thể gọi thêm lệnh SET/GET nào nữa.
const redisSub = new Redis(REDIS_CONFIG);

redisSub.on('connect', () =>
  console.log('[seat-service] ✓ Redis (subscriber) kết nối thành công')
);
redisSub.on('error', (err) =>
  console.warn('[seat-service] ✗ Redis (subscriber) lỗi:', err.message)
);

module.exports = { redis, redisSub };
