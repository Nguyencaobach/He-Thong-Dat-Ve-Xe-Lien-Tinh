/**
 * tripCache.js - Redis Cache cho kết quả tìm kiếm chuyến xe
 *
 * Cache key format: search:{departure}:{destination}:{date}
 * TTL: 300 giây (5 phút) — đủ ngắn để ghế trống luôn gần đúng
 *
 * Theo đặc tả:
 * - Tách "danh sách chuyến tĩnh" (cache lâu) khỏi "số ghế còn trống" (real-time)
 * - Hiện tại cache toàn bộ TripResponse (đơn giản hóa cho demo)
 */
const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  lazyConnect: true, // Kết nối khi dùng lần đầu, không crash ngay khi Redis chưa sẵn sàng
});

redis.on('connect', () => console.log('[trip-service] ✓ Kết nối Redis thành công'));
redis.on('error', (err) => console.warn('[trip-service] ✗ Redis lỗi:', err.message));

const CACHE_TTL = parseInt(process.env.SEARCH_CACHE_TTL) || 300;

/**
 * Tạo cache key chuẩn hóa (lowercase, trim khoảng trắng)
 */
function buildSearchKey(departure, destination, date) {
  return `search:${departure.trim().toLowerCase()}:${destination.trim().toLowerCase()}:${date}`;
}

const tripCache = {
  /**
   * Lấy kết quả từ cache
   * @returns {Array|null} Mảng trips hoặc null nếu cache miss
   */
  async getSearchResult(departure, destination, date) {
    try {
      const key = buildSearchKey(departure, destination, date);
      const cached = await redis.get(key);
      if (cached) {
        console.log(`[trip-cache] HIT key=${key}`);
        return JSON.parse(cached);
      }
      console.log(`[trip-cache] MISS key=${key}`);
      return null;
    } catch (err) {
      // Cache lỗi không được làm chết toàn bộ service
      console.warn('[trip-cache] Lỗi đọc cache:', err.message);
      return null;
    }
  },

  /**
   * Xóa cache khi số ghế thay đổi
   */
  async clearSearchResult(departure, destination, date) {
    try {
      const key = buildSearchKey(departure, destination, date);
      await redis.del(key);
      console.log(`[trip-cache] Xóa cache key=${key}`);
    } catch (err) {
      console.warn('[trip-cache] Lỗi xóa cache:', err.message);
    }
  },

  /**
   * Lưu kết quả vào cache
   */
  async setSearchResult(departure, destination, date, trips) {
    try {
      const key = buildSearchKey(departure, destination, date);
      await redis.setex(key, CACHE_TTL, JSON.stringify(trips));
      console.log(`[trip-cache] SET key=${key} TTL=${CACHE_TTL}s`);
    } catch (err) {
      console.warn('[trip-cache] Lỗi ghi cache:', err.message);
    }
  },

  /**
   * Xóa cache của một tuyến (khi có ghế mới được đặt)
   */
  async invalidateSearchCache(departure, destination, date) {
    try {
      const key = buildSearchKey(departure, destination, date);
      await redis.del(key);
      console.log(`[trip-cache] INVALIDATED key=${key}`);
    } catch (err) {
      console.warn('[trip-cache] Lỗi xóa cache:', err.message);
    }
  },

  /**
   * Xóa toàn bộ cache tìm kiếm khi thêm/sửa/xóa chuyến xe
   */
  async clearAllSearchCache() {
    try {
      const keys = await redis.keys('search:*');
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`[trip-cache] Đã xóa ${keys.length} cache tìm kiếm chuyến xe.`);
      }
    } catch (err) {
      console.warn('[trip-cache] Lỗi xóa toàn bộ cache tìm kiếm:', err.message);
    }
  },

  async quit() {
    await redis.quit();
  },
};

module.exports = tripCache;
