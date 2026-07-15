/**
 * server.js - Entry point của notification-worker
 *
 * Worker chạy nền: lắng nghe "ticket.issued" và gửi email giả lập.
 * Không có HTTP port hay gRPC Server.
 */
const { startTicketIssuedConsumer, stopTicketIssuedConsumer } = require('./ticketIssuedConsumer');
const { initTransporter } = require('./emailSender');
require('dotenv').config();

async function start() {
  try {
    console.log('[notification-worker] Đang khởi động...');

    // Khởi tạo transporter email
    await initTransporter();

    // Bắt đầu lắng nghe ticket.issued
    await startTicketIssuedConsumer();

    console.log('[notification-worker] ✓ Khởi động hoàn tất! Đang chờ sự kiện ticket.issued...');

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`[notification-worker] Nhận ${signal}, đang dừng...`);
      await stopTicketIssuedConsumer();
      process.exit(0);
    };

    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[notification-worker] Lỗi khởi động:', error.message);
    process.exit(1);
  }
}

start();
