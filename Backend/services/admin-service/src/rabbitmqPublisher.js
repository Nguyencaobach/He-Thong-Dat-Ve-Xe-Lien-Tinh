/**
 * rabbitmqPublisher.js - Publish admin events lên RabbitMQ
 * Exchange: admin.events (dành cho analytics-consumer, Giai đoạn 8)
 */
const amqp = require('amqplib');
require('dotenv').config();

const RABBITMQ_URL  = process.env.RABBITMQ_URL            || 'amqp://admin:admin123@localhost:5672';
const EXCHANGE_NAME = process.env.ADMIN_EVENTS_EXCHANGE   || 'admin.events';

let channel = null, connection = null;

async function connect(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel    = await connection.createChannel();
      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      console.log('[admin-service] ✓ Kết nối RabbitMQ thành công');
      connection.on('error', () => { channel = null; });
      return;
    } catch (err) {
      console.warn(`[admin-service] RabbitMQ chưa sẵn sàng (${i}/${retries}):`, err.message);
      if (i < retries) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.warn('[admin-service] Bỏ qua RabbitMQ publisher.');
}

async function publish(routingKey, payload) {
  if (!channel) return;
  channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true, contentType: 'application/json',
  });
}

async function close() {
  try { if (channel) await channel.close(); if (connection) await connection.close(); } catch { }
}

module.exports = { connect, publish, close };
