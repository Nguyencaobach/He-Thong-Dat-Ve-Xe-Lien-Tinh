/**
 * seatEventsConsumer.js - API Gateway lắng nghe Redis Pub/Sub và đẩy về Frontend
 *
 * ═══ LUỒNG DỮ LIỆU REAL-TIME ════════════════════════════════════════════════
 *
 *   [seat-service]
 *       │ sau mỗi thay đổi ghế (hold/release/book/block)
 *       │ redis.publish("seat_status_updates", { tripId, seatId, seatNumber, status })
 *       ↓
 *   [Redis channel: seat_status_updates]
 *       │ subscribe
 *       ↓
 *   [api-gateway/seatEventsConsumer.js] ← FILE NÀY
 *       │ nhận message → parse JSON
 *       │ pubsub.publish(EVENTS.SEAT_STATUS_UPDATED, { seatStatusUpdated: { ... } })
 *       ↓
 *   [graphql-subscriptions PubSub]
 *       │ asyncIterator → stream
 *       ↓
 *   [GraphQL Subscription: seatStatusUpdated(tripId)]
 *       │ resolve → Seat object
 *       ↓
 *   [Frontend WebSocket] ← Client nhận cập nhật ghế real-time
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tại sao dùng Redis Pub/Sub thay vì RabbitMQ ở đây?
 * - Đây là dữ liệu "fire and forget" — không cần đảm bảo delivery (nếu client
 *   offline thì thôi, client sẽ fetch lại khi online)
 * - Redis Pub/Sub cực kỳ nhanh (~1ms) phù hợp cho real-time seat map
 * - api-gateway đã có Redis client (từ trip-service pattern), tận dụng luôn
 */

const Redis = require('ioredis');
const { pubsub, EVENTS } = require('./pubsub');
require('dotenv').config();

const REDIS_HOST            = process.env.REDIS_HOST  || 'localhost';
const REDIS_PORT            = parseInt(process.env.REDIS_PORT) || 6379;
const SEAT_EVENTS_CHANNEL   = process.env.SEAT_EVENTS_CHANNEL || 'seat_status_updates';

let subscriberClient = null;

/**
 * Khởi động consumer: kết nối Redis và subscribe vào channel sự kiện ghế
 *
 * Được gọi 1 lần trong server.js khi Gateway khởi động.
 * Chạy bền vững trong suốt vòng đời của Gateway.
 */
async function startSeatEventsConsumer() {
  // Tạo Redis client riêng cho SUBSCRIBE
  // (Khi đã subscribe, client Redis không thể gọi lệnh khác như GET/SET)
  subscriberClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 1000, 5000);
    },
  });

  subscriberClient.on('connect', () => {
    console.log('[api-gateway] ✓ Redis subscriber (seat events) kết nối thành công');
  });

  subscriberClient.on('error', (err) => {
    console.warn('[api-gateway] Redis subscriber error:', err.message);
  });

  // Kết nối Redis
  await subscriberClient.connect().catch(() => {
    // lazyConnect=true nên connect() có thể không throw ngay
  });

  // Subscribe vào channel sự kiện ghế từ seat-service
  await subscriberClient.subscribe(SEAT_EVENTS_CHANNEL);
  console.log(`[api-gateway] ✓ Đã subscribe Redis channel: "${SEAT_EVENTS_CHANNEL}"`);

  // Xử lý mỗi message nhận được
  subscriberClient.on('message', (channel, message) => {
    if (channel !== SEAT_EVENTS_CHANNEL) return;

    let event;
    try {
      event = JSON.parse(message);
    } catch (err) {
      console.warn('[api-gateway] seatEventsConsumer: Message không hợp lệ:', message);
      return;
    }

    const { tripId, seatId, seatNumber, status } = event;

    if (!tripId || !seatId || !status) {
      console.warn('[api-gateway] seatEventsConsumer: Thiếu field trong event:', event);
      return;
    }

    console.log(`[api-gateway] Seat event nhận được: seat=${seatNumber} status=${status} trip=${tripId}`);

    // Đẩy vào GraphQL PubSub nội bộ → các client đang subscribe sẽ nhận
    // Payload phải có cấu trúc: { seatStatusUpdated: Seat }
    // (theo resolver: resolve: (payload) => payload.seatStatusUpdated)
    pubsub.publish(EVENTS.SEAT_STATUS_UPDATED, {
      seatStatusUpdated: {
        seatId,
        seatNumber: seatNumber || seatId,
        status,
        // tripId dùng để resolver có thể filter theo tripId nếu cần
        tripId,
      },
    });
  });
}

/**
 * Đóng kết nối Redis subscriber khi Gateway shutdown
 */
async function stopSeatEventsConsumer() {
  if (subscriberClient) {
    try {
      await subscriberClient.unsubscribe(SEAT_EVENTS_CHANNEL);
      await subscriberClient.quit();
      console.log('[api-gateway] Đã đóng Redis seat events subscriber.');
    } catch (err) {
      console.warn('[api-gateway] Lỗi đóng seat events subscriber:', err.message);
    }
  }
}

module.exports = { startSeatEventsConsumer, stopSeatEventsConsumer };
