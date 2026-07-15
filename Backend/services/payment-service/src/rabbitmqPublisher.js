/**
 * rabbitmqPublisher.js - Publish kết quả thanh toán lên RabbitMQ
 *
 * Exchange: payment.events (topic)
 * Routing keys:
 *   - payment.succeeded → booking-service xác nhận ghế và chuyển PAID
 *   - payment.failed    → booking-service chuyển EXPIRED và nhả ghế
 */
const amqp = require('amqplib');
require('dotenv').config();

const RABBITMQ_URL    = process.env.RABBITMQ_URL              || 'amqp://admin:admin123@localhost:5672';
const EXCHANGE_NAME   = process.env.PAYMENT_EVENTS_EXCHANGE   || 'payment.events';

let channel    = null;
let connection = null;

async function connect(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel    = await connection.createChannel();
      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      console.log('[payment-service] ✓ Kết nối RabbitMQ thành công');
      connection.on('error', () => { channel = null; });
      return;
    } catch (err) {
      console.warn(`[payment-service] RabbitMQ chưa sẵn sàng (${i}/${retries}):`, err.message);
      if (i < retries) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.warn('[payment-service] Không thể kết nối RabbitMQ. Tiếp tục mà không có publisher.');
}

async function publish(routingKey, payload) {
  if (!channel) {
    console.warn('[payment-service] RabbitMQ channel chưa sẵn sàng, bỏ qua:', routingKey);
    return;
  }
  const message = Buffer.from(JSON.stringify(payload));
  channel.publish(EXCHANGE_NAME, routingKey, message, {
    persistent: true, contentType: 'application/json', timestamp: Date.now(),
  });
  console.log(`[payment-service] RabbitMQ PUBLISH: ${routingKey}`);
}

async function close() {
  try {
    if (channel)    await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    console.warn('[payment-service] Lỗi đóng RabbitMQ:', err.message);
  }
}

module.exports = { connect, publish, close };
