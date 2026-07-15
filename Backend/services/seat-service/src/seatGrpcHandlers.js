/**
 * seatGrpcHandlers.js - Xử lý các gRPC request từ API Gateway
 *
 * Ánh xạ các RPC method trong seat.proto sang seatService:
 *   - GetSeatMap  → seatService.getSeatMap
 *   - HoldSeat    → seatService.holdSeat
 *   - BookSeat    → seatService.bookSeat
 *
 * Pattern giống tripGrpcHandlers.js:
 * - Nhận (call, callback)
 * - Validate input
 * - Gọi service layer
 * - Trả kết quả qua callback
 */

const grpc = require('@grpc/grpc-js');
const seatService = require('./seatService');

function createSeatGrpcHandlers() {
  return {

    /**
     * GetSeatMap: Lấy sơ đồ ghế của một chuyến xe
     *
     * Request:  { tripId: string }
     * Response: { tripId: string, seats: Seat[] }
     *   Seat: { seatId, seatNumber, status }
     */
    async GetSeatMap(call, callback) {
      try {
        const { tripId } = call.request;

        if (!tripId) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu tripId',
          });
        }

        console.log(`[seat-service] GetSeatMap: tripId=${tripId}`);
        const result = await seatService.getSeatMap(tripId);

        callback(null, result);
      } catch (error) {
        console.error('[seat-service] GetSeatMap error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * HoldSeat: Giữ ghế tạm thời (AVAILABLE → HELD, TTL 5 phút)
     *
     * Request:  { tripId: string, seatId: string, userId: string }
     * Response: { success: bool, message: string }
     *
     * Race condition handling:
     * - Hai request HoldSeat cùng seatId cùng lúc
     * - Redis SETNX đảm bảo chỉ một trong hai thành công (atomic)
     * - Request còn lại nhận success=false, message="Ghế đang được người khác giữ"
     */
    async HoldSeat(call, callback) {
      try {
        const { tripId, seatId, userId } = call.request;

        if (!tripId || !seatId) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu tripId hoặc seatId',
          });
        }

        const effectiveUserId = userId || 'guest';
        console.log(`[seat-service] HoldSeat: tripId=${tripId}, seatId=${seatId}, userId=${effectiveUserId}`);

        const result = await seatService.holdSeat(tripId, seatId, effectiveUserId);

        // Trả về đúng format proto: { success, message }
        callback(null, {
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        console.error('[seat-service] HoldSeat error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * BookSeat: Chốt ghế vĩnh viễn sau thanh toán (HELD → BOOKED)
     *
     * Request:  { tripId: string, seatId: string }
     *           (bookingId và userId được truyền thêm trong metadata hoặc field mở rộng)
     * Response: { success: bool, message: string }
     *
     * Được gọi bởi booking-service sau khi payment-service confirm thành công.
     * Nếu hold đã hết TTL → trả success=false.
     */
    async BookSeat(call, callback) {
      try {
        const { tripId, seatId } = call.request;
        // bookingId và userId có thể được gửi trong metadata gRPC
        // Lấy từ metadata nếu có, nếu không thì dùng giá trị mặc định cho demo
        const metadata = call.metadata;
        const bookingId = metadata.get('booking-id')[0] || `booking_${Date.now()}`;
        const userId    = metadata.get('user-id')[0]    || 'system';

        if (!tripId || !seatId) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu tripId hoặc seatId',
          });
        }

        console.log(`[seat-service] BookSeat: tripId=${tripId}, seatId=${seatId}, bookingId=${bookingId}`);
        const result = await seatService.bookSeat(tripId, seatId, userId, bookingId);

        callback(null, {
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        console.error('[seat-service] BookSeat error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * ReleaseSeat: Nhả ghế chủ động (HELD → AVAILABLE)
     *
     * Được gọi khi:
     * - Khách hủy giữa chừng
     * - Booking hết hạn thanh toán (EXPIRED)
     *
     * Request:  { tripId: string, seatId: string }
     * Response: { success: bool, message: string }
     *
     * Note: Proto hiện tại (seat.proto) chưa có RPC này, sẽ thêm ở giai đoạn sau
     * khi booking-service cần gọi. Tạm thời handler vẫn được define ở đây để sẵn sàng.
     */
    async ReleaseSeat(call, callback) {
      try {
        const { tripId, seatId } = call.request;
        const metadata = call.metadata;
        const userId = metadata.get('user-id')[0] || 'system';

        if (!tripId || !seatId) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu tripId hoặc seatId',
          });
        }

        console.log(`[seat-service] ReleaseSeat: tripId=${tripId}, seatId=${seatId}`);
        const result = await seatService.forceReleaseSeat(tripId, seatId);

        callback(null, {
          success: result.success,
          message: result.message || 'Nhả ghế thành công.',
        });
      } catch (error) {
        console.error('[seat-service] ReleaseSeat error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },
  };
}

module.exports = { createSeatGrpcHandlers };
