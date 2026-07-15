/**
 * outboxWorker.js - Worker đọc outbox_events và publish lên RabbitMQ + Kafka
 *
 * Outbox Pattern: Đảm bảo event và DB change được commit cùng lúc.
 * Worker poll DB định kỳ, gửi các event chưa được publish.
 *
 * Routing:
 *   booking.paid      → RabbitMQ (ticket-worker) + Kafka (analytics)
 *   booking.cancelled → RabbitMQ (notification-worker)
 *   booking.expired   → RabbitMQ (notification-worker)
 */
const outboxEventRepository = require('./outboxEventRepository');
const rabbitmqPublisher      = require('./rabbitmqPublisher');
const kafkaPublisher         = require('./kafkaPublisher');
require('dotenv').config();

const POLL_INTERVAL_MS = parseInt(process.env.BOOKING_OUTBOX_POLL_INTERVAL_MS) || 2000;
const BATCH_SIZE       = parseInt(process.env.BOOKING_OUTBOX_BATCH_SIZE)        || 20;

let pollTimer = null;
let running   = false;

/**
 * Xử lý một event outbox: publish lên đúng kênh theo event_type
 */
async function processEvent(event) {
  const payload = typeof event.payload === 'string'
    ? JSON.parse(event.payload)
    : event.payload;

  switch (event.event_type) {
    case 'booking.paid':
      // Publish lên RabbitMQ → ticket-worker sẽ consume để sinh vé
      await rabbitmqPublisher.publish('booking.paid', payload);
      // Publish lên Kafka → analytics-consumer
      await kafkaPublisher.publishBookingEvent('booking.paid', payload);
      break;

    case 'booking.cancelled':
      await rabbitmqPublisher.publish('booking.cancelled', payload);
      break;

    case 'booking.expired':
      await rabbitmqPublisher.publish('booking.expired', payload);
      break;

    default:
      console.warn(`[outbox-worker] Event type không xác định: ${event.event_type}`);
  }
}

/**
 * Một vòng lặp poll: lấy batch event → xử lý → đánh dấu kết quả
 */
async function pollAndPublish() {
  try {
    const events = await outboxEventRepository.getPendingEvents(BATCH_SIZE);

    if (events.length > 0) {
      console.log(`[outbox-worker] Xử lý ${events.length} event(s)...`);
    }

    for (const event of events) {
      try {
        await processEvent(event);
        await outboxEventRepository.markPublished(event.id);
      } catch (err) {
        console.error(`[outbox-worker] Lỗi publish event ${event.id} (${event.event_type}):`, err.message);
        await outboxEventRepository.markFailed(event.id, err.message);
      }
    }
  } catch (err) {
    console.error('[outbox-worker] Lỗi poll DB:', err.message);
  }
}

function start() {
  if (running) return;
  running = true;
  console.log(`[outbox-worker] Bắt đầu polling mỗi ${POLL_INTERVAL_MS}ms...`);
  pollTimer = setInterval(pollAndPublish, POLL_INTERVAL_MS);
}

function stop() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    running   = false;
    console.log('[outbox-worker] Đã dừng.');
  }
}

module.exports = { start, stop };
