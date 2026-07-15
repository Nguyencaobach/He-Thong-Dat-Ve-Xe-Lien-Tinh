/**
 * health.js - Kiểm tra trạng thái hoạt động của seat-service
 *
 * Hàm này được gọi định kỳ hoặc khi có yêu cầu từ hệ thống monitoring
 * để xác nhận Redis vẫn kết nối được (Redis là DB chính của service này).
 */

const { redis } = require('./redisClient');

/**
 * Kiểm tra Redis có sống không bằng lệnh PING
 * @returns {{ status: 'ok' | 'error', redis: string }}
 */
async function checkHealth() {
  try {
    const result = await redis.ping();
    return {
      service: 'seat-service',
      status: result === 'PONG' ? 'ok' : 'degraded',
      redis: result === 'PONG' ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      service: 'seat-service',
      status: 'error',
      redis: `disconnected: ${err.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { checkHealth };
