/**
 * ticketIssuedConsumer.js - Lắng nghe event ticket.issued từ RabbitMQ
 *
 * ═══ LUỒNG ════════════════════════════════════════════════════════════════
 * ticket-worker → PUBLISH → RabbitMQ exchange "ticket.events"
 *                             routing key: "ticket.issued"
 *
 * notification-worker → SUBSCRIBE → queue "notification.ticket_issued"
 *   1. Nhận payload ticket.issued (chứa danh sách vé đã sinh)
 *   2. Tìm email hành khách từ payload
 *   3. Gọi emailSender.sendBookingConfirmationEmail()
 *
 * ════════════════════════════════════════════════════════════════════════════
 */
const amqp = require('amqplib');
const { sendBookingConfirmationEmail } = require('./emailSender');
require('dotenv').config();

const RABBITMQ_URL     = process.env.RABBITMQ_URL             || 'amqp://admin:admin123@localhost:5672';
const TICKET_EXCHANGE  = process.env.TICKET_EVENTS_EXCHANGE   || 'ticket.events';
const QUEUE_NAME       = process.env.TICKET_ISSUED_QUEUE      || 'notification.ticket_issued';

let connection = null;
let channel    = null;

async function startTicketIssuedConsumer(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel    = await connection.createChannel();

      // Khai báo exchange (phải khớp với ticket-worker)
      await channel.assertExchange(TICKET_EXCHANGE, 'topic', { durable: true });

      // Queue riêng cho notification-worker
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      // Bind nhận routing key "ticket.issued"
      await channel.bindQueue(QUEUE_NAME, TICKET_EXCHANGE, 'ticket.issued');

      channel.prefetch(1);

      await channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;

        let payload;
        try {
          payload = JSON.parse(msg.content.toString());
        } catch (err) {
          console.error('[notification-worker] Message không hợp lệ:', msg.content.toString());
          channel.nack(msg, false, false);
          return;
        }

        const { bookingId, tickets = [] } = payload;
        console.log(`[notification-worker] Nhận ticket.issued: bookingId=${bookingId}, ${tickets.length} vé`);

        try {
          // Xác định email người nhận:
          // Ưu tiên email của passenger đầu tiên có email
          const firstPassengerWithEmail = tickets.find((t) => t.passengerEmail);
          const recipientEmail = firstPassengerWithEmail?.passengerEmail || null;
          const recipientName  = firstPassengerWithEmail?.passengerName  || 'Quý khách';

          await sendBookingConfirmationEmail({
            to:            recipientEmail,
            recipientName,
            bookingId,
            tickets,
          });

          console.log(`[notification-worker] ✓ Gửi email xác nhận booking ${bookingId}`);
          channel.ack(msg);

        } catch (err) {
          console.error(`[notification-worker] Lỗi gửi email booking ${bookingId}:`, err.message);
          channel.nack(msg, false, true);
        }
      });

      console.log(`[notification-worker] ✓ Lắng nghe "ticket.issued" từ exchange "${TICKET_EXCHANGE}" queue "${QUEUE_NAME}"`);
      return;

    } catch (err) {
      console.warn(`[notification-worker] RabbitMQ chưa sẵn sàng (${i}/${retries}):`, err.message);
      if (i < retries) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error('[notification-worker] Không thể kết nối RabbitMQ sau nhiều lần thử.');
}

async function stopTicketIssuedConsumer() {
  try {
    if (channel)    await channel.close();
    if (connection) await connection.close();
    console.log('[notification-worker] Đã đóng RabbitMQ consumer.');
  } catch (err) {
    console.warn('[notification-worker] Lỗi đóng consumer:', err.message);
  }
}

module.exports = { startTicketIssuedConsumer, stopTicketIssuedConsumer };
