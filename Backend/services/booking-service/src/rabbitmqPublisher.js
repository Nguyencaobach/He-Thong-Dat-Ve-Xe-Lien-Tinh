/**
 * rabbitmqPublisher.js - Publish sự kiện từ booking-service lên RabbitMQ
 *
 * Exchange: booking.events (topic)
 * Routing keys:
 *   - booking.paid      → ticket-worker subscribe để sinh vé
 *   - booking.cancelled → notification-worker gửi email thông báo hủy
 *   - booking.expired   → notification-worker gửi email thông báo hết hạn
 */
const amqp = require('amqplib');
require('dotenv').config();

const RABBITMQ_URL     = process.env.RABBITMQ_URL          || 'amqp://admin:admin123@localhost:5672';
const EXCHANGE_NAME    = process.env.BOOKING_PAID_EXCHANGE  || 'booking.events';

let channel    = null;
let connection = null;

async function connect(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel    = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      console.log('[booking-service] ✓ Kết nối RabbitMQ publisher thành công');

      connection.on('error', () => { channel = null; });
      return;
    } catch (err) {
      console.warn(`[booking-service] RabbitMQ publisher chưa sẵn sàng (${i}/${retries}):`, err.message);
      if (i < retries) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.warn('[booking-service] Không thể kết nối RabbitMQ publisher. Tiếp tục mà không có publisher.');
}

async function publish(routingKey, payload) {
  if (!channel) {
    console.warn('[booking-service] RabbitMQ channel chưa sẵn sàng, bỏ qua publish:', routingKey);
    return;
  }
  try {
    const message = Buffer.from(JSON.stringify(payload));
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent:  true,
      contentType: 'application/json',
      timestamp:   Date.now(),
    });
    console.log(`[booking-service] RabbitMQ PUBLISH: ${routingKey}`);
  } catch (err) {
    console.error('[booking-service] RabbitMQ publish error:', err.message);
    throw err;
  }
}

async function close() {
  try {
    if (channel)    await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    console.warn('[booking-service] Lỗi đóng RabbitMQ publisher:', err.message);
  }
}

module.exports = { connect, publish, close };
