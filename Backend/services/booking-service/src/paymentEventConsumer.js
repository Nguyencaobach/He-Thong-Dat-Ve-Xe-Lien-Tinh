/**
 * paymentEventConsumer.js - Lắng nghe kết quả thanh toán từ payment-service qua RabbitMQ
 *
 * ═══ LUỒNG ═══════════════════════════════════════════════════════════════════
 * payment-service (sau khi xử lý) → PUBLISH → RabbitMQ exchange "payment.events"
 *                                               routing key: "payment.succeeded" / "payment.failed"
 *
 * booking-service → SUBSCRIBE → RabbitMQ queue "booking.payment_results"
 *   - payment.succeeded → confirmPaymentSuccess() → PAID + outbox booking.paid
 *   - payment.failed    → handlePaymentFailed()   → EXPIRED + nhả ghế
 *
 * ════════════════════════════════════════════════════════════════════════════
 */
const amqp = require('amqplib');
const bookingService = require('./bookingService');
require('dotenv').config();

const RABBITMQ_URL      = process.env.RABBITMQ_URL       || 'amqp://admin:admin123@localhost:5672';
const PAYMENT_EXCHANGE  = process.env.RABBITMQ_EXCHANGE  || 'payment.events';
const QUEUE_NAME        = 'booking.payment_results';

let connection = null;
let channel    = null;

async function startPaymentEventConsumer(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel    = await connection.createChannel();

      // Khai báo exchange (phải khớp với payment-service)
      await channel.assertExchange(PAYMENT_EXCHANGE, 'topic', { durable: true });

      // Khai báo queue riêng cho booking-service
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      // Bind queue với các routing key cần thiết
      await channel.bindQueue(QUEUE_NAME, PAYMENT_EXCHANGE, 'payment.succeeded');
      await channel.bindQueue(QUEUE_NAME, PAYMENT_EXCHANGE, 'payment.failed');

      // Chỉ nhận 1 message tại một thời điểm (tránh process song song gây race condition)
      channel.prefetch(1);

      // Bắt đầu consume
      await channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;

        let payload;
        try {
          payload = JSON.parse(msg.content.toString());
        } catch (err) {
          console.error('[payment-consumer] Message không hợp lệ:', msg.content.toString());
          channel.nack(msg, false, false); // Reject, không requeue
          return;
        }

        const routingKey = msg.fields.routingKey;
        console.log(`[payment-consumer] Nhận event: ${routingKey}`, payload);

        try {
          if (routingKey === 'payment.succeeded') {
            await bookingService.confirmPaymentSuccess({
              bookingId:     payload.bookingId,
              transactionId: payload.transactionId,
              paymentMethod: payload.paymentMethod,
            });
          } else if (routingKey === 'payment.failed') {
            await bookingService.handlePaymentFailed({
              bookingId: payload.bookingId,
            });
          }

          // ACK: message đã xử lý thành công
          channel.ack(msg);
        } catch (err) {
          console.error(`[payment-consumer] Lỗi xử lý ${routingKey}:`, err.message);
          // NACK và requeue để thử lại
          channel.nack(msg, false, true);
        }
      });

      console.log(`[booking-service] ✓ Lắng nghe payment events từ exchange "${PAYMENT_EXCHANGE}" queue "${QUEUE_NAME}"`);
      return;

    } catch (err) {
      console.warn(`[payment-consumer] RabbitMQ chưa sẵn sàng (${i}/${retries}):`, err.message);
      if (i < retries) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.warn('[payment-consumer] Không thể kết nối RabbitMQ consumer. Sự kiện thanh toán sẽ không được xử lý.');
}

async function stopPaymentEventConsumer() {
  try {
    if (channel)    await channel.close();
    if (connection) await connection.close();
    console.log('[booking-service] Đã đóng RabbitMQ payment consumer.');
  } catch (err) {
    console.warn('[booking-service] Lỗi đóng payment consumer:', err.message);
  }
}

module.exports = { startPaymentEventConsumer, stopPaymentEventConsumer };
