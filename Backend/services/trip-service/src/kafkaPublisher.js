/**
 * kafkaPublisher.js - Gửi event lên Kafka (dùng bởi outboxWorker)
 *
 * Kafka topic: search-events
 * Analytics Consumer sẽ đọc topic này để tổng hợp báo cáo tìm kiếm.
 */
const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'trip-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: { retries: 3 },
});

const producer = kafka.producer();
let isConnected = false;

const kafkaPublisher = {
  async connect() {
    await producer.connect();
    isConnected = true;
    console.log('[trip-service] ✓ Kafka Producer đã kết nối');
  },

  async disconnect() {
    if (isConnected) {
      await producer.disconnect();
      isConnected = false;
      console.log('[trip-service] Kafka Producer đã ngắt kết nối');
    }
  },

  /**
   * Gửi một event lên Kafka
   * @param {string} topic - Tên topic (vd: 'search-events')
   * @param {object} event - Nội dung event
   */
  async publish(topic, event) {
    if (!isConnected) {
      throw new Error('Kafka Producer chưa kết nối. Gọi kafkaPublisher.connect() trước.');
    }
    await producer.send({
      topic,
      messages: [
        {
          key: event.eventId || String(Date.now()),
          value: JSON.stringify(event),
          headers: {
            eventType: event.eventType || 'unknown',
            version: String(event.version || 1),
          },
        },
      ],
    });
  },
};

module.exports = kafkaPublisher;
