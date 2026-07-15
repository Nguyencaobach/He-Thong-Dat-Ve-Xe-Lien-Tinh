/**
 * kafkaPublisher.js - Publish booking-events lên Kafka để Analytics Consumer đọc
 *
 * Topic: booking-events
 * Message: { bookingId, userId, tripId, totalAmount, paidAt, ... }
 *
 * Tại sao Kafka cho analytics (Đặc tả 6.4):
 * - Analytics Consumer cần đọc stream sự kiện lặp lại được (many consumers, replay)
 * - Khác với RabbitMQ (work queue — mỗi message chỉ 1 consumer xử lý 1 lần)
 */
const { Kafka } = require('kafkajs');
require('dotenv').config();

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const CLIENT_ID     = process.env.KAFKA_CLIENT_ID              || 'booking-service';
const TOPIC         = process.env.KAFKA_TOPIC_BOOKING_EVENTS   || 'booking-events';

const kafka    = new Kafka({ clientId: CLIENT_ID, brokers: KAFKA_BROKERS });
const producer = kafka.producer();

let connected = false;

async function connect() {
  try {
    await producer.connect();
    connected = true;
    console.log('[booking-service] ✓ Kết nối Kafka producer thành công');
  } catch (err) {
    console.warn('[booking-service] Kafka producer chưa sẵn sàng:', err.message);
  }
}

async function publishBookingEvent(eventType, payload) {
  if (!connected) {
    console.warn('[booking-service] Kafka chưa kết nối, bỏ qua publish booking event');
    return;
  }
  try {
    await producer.send({
      topic: TOPIC,
      messages: [{
        key:   payload.bookingId,
        value: JSON.stringify({ eventType, ...payload, timestamp: new Date().toISOString() }),
      }],
    });
    console.log(`[booking-service] Kafka PUBLISH: ${TOPIC}/${eventType}`);
  } catch (err) {
    console.error('[booking-service] Kafka publish error:', err.message);
    throw err;
  }
}

async function close() {
  if (connected) {
    await producer.disconnect();
    connected = false;
  }
}

module.exports = { connect, publishBookingEvent, close };
