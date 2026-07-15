/**
 * outboxWorker.js - Cronjob Outbox Pattern
 *
 * Chạy độc lập (có thể tách thành process riêng sau).
 * Poll bảng outbox_events mỗi POLL_INTERVAL_MS giây:
 *   1. Lấy batch events đang pending
 *   2. Gửi lên Kafka topic tương ứng
 *   3. Đánh dấu published hoặc failed
 *
 * Đây là cơ chế đảm bảo "at-least-once delivery" cho Kafka.
 */
const outboxEventRepository = require('./outboxEventRepository');
const kafkaPublisher = require('./kafkaPublisher');
require('dotenv').config();

const POLL_INTERVAL_MS = parseInt(process.env.TRIP_OUTBOX_POLL_INTERVAL_MS) || 2000;
const BATCH_SIZE = parseInt(process.env.TRIP_OUTBOX_BATCH_SIZE) || 20;
let shouldStop = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildKafkaEvent(row) {
  return {
    eventId: row.id,
    eventType: row.event_type,
    occurredAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at,
    version: row.version ?? 1,
    correlationId: row.correlation_id ?? null,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
  };
}

async function processRow(row) {
  const event = buildKafkaEvent(row);
  await kafkaPublisher.publish(row.topic, event);
  await outboxEventRepository.markPublished(row.id);
  console.log(`[trip-outbox-worker] ✓ published eventId=${row.id} type=${row.event_type}`);
}

async function run() {
  console.log('[trip-outbox-worker] Khởi động...');
  await kafkaPublisher.connect();

  // Reset các event stuck từ lần chạy trước (nếu worker crash)
  await outboxEventRepository.resetStuckEvents();

  while (!shouldStop) {
    const rows = await outboxEventRepository.reservePendingEvents(BATCH_SIZE);

    if (rows.length === 0) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    for (const row of rows) {
      try {
        await processRow(row);
      } catch (error) {
        console.error(`[trip-outbox-worker] ✗ failed eventId=${row.id}:`, error.message);
        await outboxEventRepository.markFailed(row.id, error);
      }
    }
  }
}

async function shutdown() {
  console.log('[trip-outbox-worker] Đang dừng...');
  shouldStop = true;
  await kafkaPublisher.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

run().catch(async (error) => {
  console.error('[trip-outbox-worker] Fatal error:', error);
  await kafkaPublisher.disconnect();
  process.exit(1);
});
