/**
 * paymentGrpcHandlers.js - Xử lý gRPC request từ API Gateway
 */
const grpc = require('@grpc/grpc-js');
const paymentService = require('./paymentService');

function createPaymentGrpcHandlers() {
  return {

    /**
     * ProcessPayment: Giả lập xử lý thanh toán
     * Request: { bookingId, amount, paymentMethod }
     * Response: { success, transactionId, message }
     */
    async ProcessPayment(call, callback) {
      try {
        const { bookingId, amount, paymentMethod } = call.request;

        if (!bookingId || !amount) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu bookingId hoặc amount',
          });
        }

        console.log(`[payment-service] ProcessPayment: booking=${bookingId} amount=${amount} method=${paymentMethod}`);

        const result = await paymentService.processPayment({ bookingId, amount, paymentMethod });

        callback(null, result);
      } catch (error) {
        console.error('[payment-service] ProcessPayment error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * CheckPaymentStatus: Kiểm tra trạng thái transaction
     * Request: { transactionId }
     * Response: { status }
     */
    async CheckPaymentStatus(call, callback) {
      try {
        const { transactionId } = call.request;

        if (!transactionId) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu transactionId' });
        }

        const result = await paymentService.checkPaymentStatus(transactionId);
        callback(null, result);
      } catch (error) {
        console.error('[payment-service] CheckPaymentStatus error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },
  };
}

module.exports = { createPaymentGrpcHandlers };
