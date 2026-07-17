/**
 * bookingPaidConsumer.js - Lắng nghe event booking.paid từ RabbitMQ
 *
 * ═══ LUỒNG ════════════════════════════════════════════════════════════════
 * booking-service → PUBLISH → RabbitMQ exchange "booking.events"
 *                              routing key: "booking.paid"
 *
 * ticket-worker → SUBSCRIBE → queue "ticket.booking_paid"
 *   1. Nhận payload booking.paid
 *   2. Gọi ticketGenerator.generateTickets() → sinh file HTML cho mỗi ghế
 *   3. Publish "ticket.issued" lên RabbitMQ exchange "ticket.events"
 *      → notification-worker sẽ consume để gửi email
 *
 * ════════════════════════════════════════════════════════════════════════════
 */
const amqp = require('amqplib');
const { generateTickets } = require('./ticketGenerator');
const rabbitmqPublisher   = require('./rabbitmqPublisher');
require('dotenv').config();

const RABBITMQ_URL      = process.env.RABBITMQ_URL              || 'amqp://admin:admin123@localhost:5672';
const BOOKING_EXCHANGE  = process.env.BOOKING_EVENTS_EXCHANGE   || 'booking.events';
const QUEUE_NAME        = process.env.BOOKING_PAID_QUEUE        || 'ticket.booking_paid';

let connection = null;
let channel    = null;

async function startBookingPaidConsumer(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel    = await connection.createChannel();

      // Khai báo exchange (phải khớp với booking-service)
      await channel.assertExchange(BOOKING_EXCHANGE, 'topic', { durable: true });

      // Queue riêng cho ticket-worker
      await channel.assertQueue(QUEUE_NAME, {
        durable: true, // Giữ queue khi RabbitMQ restart
      });

      // Bind queue nhận routing key "booking.paid"
      await channel.bindQueue(QUEUE_NAME, BOOKING_EXCHANGE, 'booking.paid');

      // Xử lý 1 message tại một thời điểm (đảm bảo sinh vé tuần tự)
      channel.prefetch(1);

      await channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;

        let payload;
        try {
          payload = JSON.parse(msg.content.toString());
        } catch (err) {
          console.error('[ticket-worker] Message không hợp lệ:', msg.content.toString());
          channel.nack(msg, false, false); // Reject, không requeue
          return;
        }

        console.log(`[ticket-worker] Nhận booking.paid: bookingId=${payload.bookingId}`);

        try {
          // TASK-02: Sinh vé cho tất cả ghế trong booking
          const tickets = await generateTickets(payload);

          // TASK-03: Publish event "ticket.issued" để notification-worker gửi email
          await rabbitmqPublisher.publish('ticket.issued', {
            bookingId:  payload.bookingId,
            userId:     payload.userId,
            tripId:     payload.tripId,
            paidAt:     payload.paidAt,
            tripInfo:   payload.tripInfo,
            tickets,   // Danh sách vé đã sinh: [{ ticketId, seatId, qrCode, htmlPath, passengerName, passengerEmail }]
          });

          console.log(`[ticket-worker] ✓ Hoàn thành: ${tickets.length} vé cho booking ${payload.bookingId}`);

          // ACK: đánh dấu message đã xử lý thành công
          channel.ack(msg);

        } catch (err) {
          console.error(`[ticket-worker] Lỗi xử lý booking ${payload.bookingId}:`, err.message);
          // NACK và requeue để thử lại
          channel.nack(msg, false, true);
        }
      });

      console.log(`[ticket-worker] ✓ Lắng nghe "booking.paid" từ exchange "${BOOKING_EXCHANGE}" queue "${QUEUE_NAME}"`);
      return;

    } catch (err) {
      console.warn(`[ticket-worker] RabbitMQ chưa sẵn sàng (${i}/${retries}):`, err.message);
      if (i < retries) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error('[ticket-worker] Không thể kết nối RabbitMQ sau nhiều lần thử.');
}

async function stopBookingPaidConsumer() {
  try {
    if (channel)    await channel.close();
    if (connection) await connection.close();
    console.log('[ticket-worker] Đã đóng RabbitMQ consumer.');
  } catch (err) {
    console.warn('[ticket-worker] Lỗi đóng consumer:', err.message);
  }
}

module.exports = { startBookingPaidConsumer, stopBookingPaidConsumer };
