/**
 * bookingGrpcHandlers.js - Xử lý gRPC request từ API Gateway
 *
 * Ánh xạ 3 RPC từ booking.proto:
 *   - CreateBooking → bookingService.createBooking
 *   - GetBooking    → bookingService.getBooking
 *   - CancelBooking → bookingService.cancelBooking
 */
const grpc = require('@grpc/grpc-js');
const bookingService = require('./bookingService');

function createBookingGrpcHandlers() {
  return {

    /**
     * CreateBooking: Tạo đơn đặt vé mới
     * Request: { userId, tripId, seatIds[] }
     * Response: { success, bookingId, message }
     */
    async CreateBooking(call, callback) {
      try {
        const { userId, tripId, seatIds } = call.request;

        if (!tripId || !seatIds || seatIds.length === 0) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu tripId hoặc seatIds',
          });
        }

        console.log(`[booking-service] CreateBooking: trip=${tripId} seats=${seatIds.join(',')}`);

        const booking = await bookingService.createBooking({
          userId:  userId || 'guest',
          tripId,
          seatIds,
        });

        callback(null, {
          success:   true,
          bookingId: booking.id,
          message:   `Tạo booking thành công. Vui lòng thanh toán trong ${Math.round((new Date(booking.expires_at) - Date.now()) / 60000)} phút.`,
        });
      } catch (error) {
        console.error('[booking-service] CreateBooking error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * GetBooking: Lấy thông tin đơn vé
     * Request: { bookingId }
     * Response: BookingResponse
     */
    async GetBooking(call, callback) {
      try {
        const { bookingId } = call.request;

        if (!bookingId) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu bookingId' });
        }

        const booking = await bookingService.getBooking(bookingId);

        callback(null, {
          bookingId:   booking.id,
          userId:      booking.user_id,
          tripId:      booking.trip_id,
          seatIds:     booking.seat_ids,
          totalAmount: parseFloat(booking.total_amount),
          status:      booking.status,
        });
      } catch (error) {
        if (error.message.includes('Không tìm thấy')) {
          return callback({ code: grpc.status.NOT_FOUND, message: error.message });
        }
        console.error('[booking-service] GetBooking error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * CancelBooking: Hủy đơn vé
     * Request: { bookingId, userId }
     * Response: { success, message }
     */
    async CancelBooking(call, callback) {
      try {
        const { bookingId, userId } = call.request;

        if (!bookingId) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu bookingId' });
        }

        console.log(`[booking-service] CancelBooking: ${bookingId} by user=${userId}`);
        await bookingService.cancelBooking({ bookingId, userId });

        callback(null, { success: true, message: 'Hủy booking thành công.' });
      } catch (error) {
        console.error('[booking-service] CancelBooking error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },
  };
}

module.exports = { createBookingGrpcHandlers };
