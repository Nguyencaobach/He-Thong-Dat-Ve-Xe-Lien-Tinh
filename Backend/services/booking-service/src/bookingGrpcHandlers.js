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
        const { userId, tripId, seatIds, passengers } = call.request;

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
          passengers,
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
          passengers:  booking.passengers ? booking.passengers.map(p => ({
            fullName: p.full_name,
            phone: p.phone,
            email: p.email,
            idNumber: p.id_number,
            seatId: p.seat_id,
            seatNumber: p.seat_number
          })) : [],
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

    /**
     * ListBookingsByUser: Lấy danh sách đơn vé của user
     * Request: { userId, limit }
     * Response: { bookings[] }
     */
    async ListBookingsByUser(call, callback) {
      try {
        const { userId, limit } = call.request;

        if (!userId) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu userId' });
        }

        const bookings = await bookingService.listBookingsByUser(userId, limit || 50);

        callback(null, {
          bookings: bookings.map(b => ({
            bookingId:   b.id,
            userId:      b.user_id,
            tripId:      b.trip_id,
            seatIds:     b.seat_ids,
            totalAmount: parseFloat(b.total_amount),
            status:      b.status,
            passengers:  b.passengers ? b.passengers.map(p => ({
              fullName: p.full_name,
              phone: p.phone,
              email: p.email,
              idNumber: p.id_number,
              seatId: p.seat_id,
              seatNumber: p.seat_number
            })) : [],
          })),
        });
      } catch (error) {
        console.error('[booking-service] ListBookingsByUser error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },
  };
}

module.exports = { createBookingGrpcHandlers };
