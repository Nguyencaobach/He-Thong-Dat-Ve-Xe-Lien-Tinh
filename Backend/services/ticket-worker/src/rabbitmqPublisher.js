/**
 * rabbitmqPublisher.js - Publish event ticket.issued lên RabbitMQ
 *
 * Exchange: ticket.events (topic)
 * Routing key: ticket.issued → notification-worker consume
 */
const amqp = require('amqplib');
require('dotenv').config();

const RABBITMQ_URL    = process.env.RABBITMQ_URL            || 'amqp://admin:admin123@localhost:5672';
const EXCHANGE_NAME   = process.env.TICKET_EVENTS_EXCHANGE  || 'ticket.events';

let channel    = null;
let connection = null;

async function connect(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel    = await connection.createChannel();
      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      console.log('[ticket-worker] ✓ Kết nối RabbitMQ publisher thành công');
      connection.on('error', () => { channel = null; });
      return;
    } catch (err) {
      console.warn(`[ticket-worker] RabbitMQ publisher chưa sẵn sàng (${i}/${retries}):`, err.message);
      if (i < retries) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.warn('[ticket-worker] Không thể kết nối RabbitMQ publisher. Tiếp tục mà không publish.');
}

async function publish(routingKey, payload) {
  if (!channel) {
    console.warn('[ticket-worker] RabbitMQ channel chưa sẵn sàng, bỏ qua publish:', routingKey);
    return;
  }
  const message = Buffer.from(JSON.stringify(payload));
  channel.publish(EXCHANGE_NAME, routingKey, message, {
    persistent: true, contentType: 'application/json', timestamp: Date.now(),
  });
  console.log(`[ticket-worker] RabbitMQ PUBLISH: ${EXCHANGE_NAME}/${routingKey}`);
}

async function close() {
  try {
    if (channel)    await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    console.warn('[ticket-worker] Lỗi đóng RabbitMQ publisher:', err.message);
  }
}

module.exports = { connect, publish, close };
