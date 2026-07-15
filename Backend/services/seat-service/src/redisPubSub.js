/**
 * redisPubSub.js - Kênh Redis Pub/Sub để phát sự kiện trạng thái ghế real-time
 *
 * ═══ TẠI SAO DÙNG REDIS PUB/SUB Ở ĐÂY? ══════════════════════════════════════
 *
 * Luồng thông báo real-time (theo đặc tả Mục 5.4):
 *
 *   seat-service (publisher)
 *       │  publish("seat_status_updates", { tripId, seatId, status })
 *       ↓
 *   Redis channel "seat_status_updates"
 *       │  subscribe
 *       ↓
 *   api-gateway/seatEventsConsumer.js (subscriber)
 *       │  pubsub.publish(EVENTS.SEAT_STATUS_UPDATED, payload)
 *       ↓
 *   GraphQL Subscription → Frontend
 *
 * Redis Pub/Sub phù hợp ở đây vì:
 * - Dữ liệu sự kiện không cần persist (chỉ cần "fire and forget" đến client)
 * - Độ trễ rất thấp (~1ms) — quan trọng cho real-time seat map
 * - seat-service đã có sẵn Redis connection, không cần thêm dependency
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { redis } = require('./redisClient');
require('dotenv').config();

// Tên channel Redis Pub/Sub — phải khớp với seatEventsConsumer.js ở api-gateway
const SEAT_EVENTS_CHANNEL = process.env.SEAT_EVENTS_CHANNEL || 'seat_status_updates';

const redisPubSub = {
  /**
   * Publish sự kiện thay đổi trạng thái ghế lên Redis channel
   *
   * Được gọi sau MỌI thay đổi trạng thái ghế:
   * - AVAILABLE → HELD    (sau holdSeat thành công)
   * - HELD → AVAILABLE    (sau releaseSeat hoặc TTL hết hạn)
   * - HELD → BOOKED       (sau bookSeat thành công)
   * - AVAILABLE → BLOCKED (sau blockSeat)
   * - BLOCKED → AVAILABLE (sau unblockSeat)
   *
   * @param {string} tripId    - ID chuyến xe
   * @param {string} seatId    - ID ghế
   * @param {string} seatNumber - Số ghế hiển thị (A01, B02...)
   * @param {string} status    - Trạng thái mới: AVAILABLE | HELD | BOOKED | BLOCKED
   */
  async publishSeatStatusChange(tripId, seatId, seatNumber, status) {
    const event = {
      tripId,
      seatId,
      seatNumber,
      status,
      updatedAt: new Date().toISOString(),
    };

    try {
      const message = JSON.stringify(event);
      const receiverCount = await redis.publish(SEAT_EVENTS_CHANNEL, message);

      console.log(
        `[seat-pubsub] PUBLISH → channel="${SEAT_EVENTS_CHANNEL}" | ` +
        `seat=${seatNumber} | status=${status} | receivers=${receiverCount}`
      );
    } catch (err) {
      // Lỗi publish KHÔNG được làm gián đoạn luồng đặt vé chính
      console.error('[seat-pubsub] Lỗi publish sự kiện:', err.message);
    }
  },
};

module.exports = { redisPubSub, SEAT_EVENTS_CHANNEL };
