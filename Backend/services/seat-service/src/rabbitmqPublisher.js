/**
 * rabbitmqPublisher.js - Publish sự kiện từ seat-service lên RabbitMQ
 *
 * seat-service dùng RabbitMQ để publish các sự kiện nghiệp vụ quan trọng:
 * - seat.expired: Ghế tự động nhả sau TTL (booking cần biết để chuyển EXPIRED)
 * - seat.force_released: Admin ép nhả ghế
 *
 * Lưu ý: Luồng chính (holdSeat, bookSeat) dùng Redis Pub/Sub cho real-time.
 * RabbitMQ ở đây chỉ dùng cho các sự kiện nghiệp vụ cần đảm bảo delivery.
 *
 * Hiện tại (Giai đoạn 4): module được khởi tạo sẵn nhưng chưa có consumer.
 * Giai đoạn 5 (booking-service) sẽ subscribe vào queue "seat.events".
 */

const amqp = require('amqplib');
require('dotenv').config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
const EXCHANGE_NAME = 'seat.events';

let channel = null;
let connection = null;

/**
 * Khởi tạo kết nối RabbitMQ và khai báo exchange
 * Retry tự động nếu RabbitMQ chưa sẵn sàng khi service start
 */
async function connect(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      // Khai báo topic exchange để routing linh hoạt
      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

      console.log('[seat-service] ✓ Kết nối RabbitMQ thành công');

      connection.on('error', (err) => {
        console.warn('[seat-service] RabbitMQ connection error:', err.message);
        channel = null;
      });

      return;
    } catch (err) {
      console.warn(`[seat-service] RabbitMQ chưa sẵn sàng (lần ${i}/${retries}):`, err.message);
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  console.warn('[seat-service] Không thể kết nối RabbitMQ. Tiếp tục mà không có RabbitMQ publisher.');
}

/**
 * Publish một sự kiện lên RabbitMQ
 * @param {string} routingKey - VD: "seat.expired", "seat.force_released"
 * @param {object} payload    - Dữ liệu sự kiện
 */
async function publish(routingKey, payload) {
  if (!channel) {
    console.warn('[seat-service] RabbitMQ channel chưa sẵn sàng, bỏ qua publish:', routingKey);
    return;
  }

  try {
    const message = Buffer.from(JSON.stringify(payload));
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true,           // Message survive RabbitMQ restart
      contentType: 'application/json',
      timestamp: Date.now(),
    });
    console.log(`[seat-service] RabbitMQ PUBLISH: ${routingKey}`, payload);
  } catch (err) {
    console.error('[seat-service] RabbitMQ publish error:', err.message);
  }
}

/**
 * Đóng kết nối gracefully khi service shutdown
 */
async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('[seat-service] Đóng kết nối RabbitMQ.');
  } catch (err) {
    console.warn('[seat-service] Lỗi đóng RabbitMQ:', err.message);
  }
}

module.exports = { connect, publish, close };
