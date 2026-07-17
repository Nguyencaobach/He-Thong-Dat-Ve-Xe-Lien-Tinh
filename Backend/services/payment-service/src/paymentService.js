/**
 * paymentService.js - Logic giả lập thanh toán (Đặc tả 6.3 điểm 4)
 *
 * Đây là service GIẢ LẬP. Trong thực tế sẽ tích hợp VNPay/Momo/CreditCard.
 * Hiện tại: random thành công/thất bại theo PAYMENT_SUCCESS_RATE.
 * Sau khi xử lý, publish kết quả lên RabbitMQ để booking-service cập nhật.
 */
const rabbitmqPublisher = require('./rabbitmqPublisher');
const paymentRepository = require('./paymentRepository');
require('dotenv').config();

const SUCCESS_RATE = parseFloat(process.env.PAYMENT_SUCCESS_RATE) || 1.0;

const paymentService = {

  /**
   * Giả lập xử lý thanh toán
   * - 90% thành công, 10% thất bại (configurable)
   * - Lưu transaction vào payment_db
   * - Publish kết quả lên RabbitMQ
   */
  async processPayment({ bookingId, amount, paymentMethod }) {
    // Giả lập thời gian xử lý (100-500ms)
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 400));

    // Quyết định thành công/thất bại
    const isSuccess = Math.random() < SUCCESS_RATE;
    const transactionId = `txn_${bookingId.substring(0, 8)}_${Date.now()}`;

    // Lưu transaction vào DB
    const transaction = await paymentRepository.createTransaction({
      bookingId,
      amount,
      paymentMethod: paymentMethod || 'unknown',
      transactionId,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
    });

    // Publish kết quả lên RabbitMQ để booking-service xử lý
    const routingKey = isSuccess ? 'payment.succeeded' : 'payment.failed';
    await rabbitmqPublisher.publish(routingKey, {
      bookingId,
      transactionId,
      amount,
      paymentMethod,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      processedAt: new Date().toISOString(),
    }).catch((err) => {
      console.error('[payment-service] Lỗi publish kết quả thanh toán:', err.message);
    });

    console.log(`[payment-service] Thanh toán ${isSuccess ? '✓ THÀNH CÔNG' : '✗ THẤT BẠI'}: booking=${bookingId} amount=${amount} method=${paymentMethod}`);

    return {
      success: isSuccess,
      transactionId,
      message: isSuccess
        ? 'Thanh toán thành công.'
        : 'Thanh toán thất bại. Vui lòng thử lại hoặc chọn phương thức khác.',
    };
  },

  /**
   * Kiểm tra trạng thái một transaction
   */
  async checkPaymentStatus(transactionId) {
    const transaction = await paymentRepository.findByTransactionId(transactionId);
    if (!transaction) {
      return { status: 'NOT_FOUND' };
    }
    return { status: transaction.status }; // SUCCESS | FAILED | PENDING
  },
};

module.exports = paymentService;
