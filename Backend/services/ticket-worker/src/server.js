/**
 * server.js - Entry point của ticket-worker
 *
 * Worker này chạy nền (không có gRPC Server, không có HTTP port).
 * Chỉ đơn giản là kết nối RabbitMQ và lắng nghe sự kiện.
 *
 * Luồng:
 *   RabbitMQ "booking.paid" → sinh vé HTML → publish "ticket.issued"
 */
const { startBookingPaidConsumer, stopBookingPaidConsumer } = require('./bookingPaidConsumer');
const rabbitmqPublisher = require('./rabbitmqPublisher');
require('dotenv').config();

async function start() {
  try {
    console.log('[ticket-worker] Đang khởi động...');

    // Kết nối publisher trước (để sau khi sinh vé có thể publish ngay)
    await rabbitmqPublisher.connect();

    // Kết nối consumer và bắt đầu lắng nghe
    await startBookingPaidConsumer();

    console.log('[ticket-worker] ✓ Khởi động hoàn tất! Đang chờ sự kiện booking.paid...');

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`[ticket-worker] Nhận ${signal}, đang dừng...`);
      await stopBookingPaidConsumer();
      await rabbitmqPublisher.close();
      process.exit(0);
    };

    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[ticket-worker] Lỗi khởi động:', error.message);
    process.exit(1);
  }
}

start();
