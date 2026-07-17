/**
 * seatService.js - Tầng logic nghiệp vụ quản lý ghế
 *
 * Tầng này nằm giữa seatGrpcHandlers.js và seatRepository.js:
 * - Handler nhận gRPC request → gọi Service
 * - Service xử lý logic → gọi Repository (Redis)
 * - Service publish sự kiện Pub/Sub sau mỗi thay đổi trạng thái
 *
 * Nguyên tắc: "Single source of truth cho trạng thái ghế"
 * - Chỉ seat-service được ghi/đọc trạng thái ghế
 * - Các service khác (booking, admin) phải gọi gRPC vào đây
 */

const seatRepository = require('./seatRepository');
const { redisPubSub } = require('./redisPubSub');

const seatService = {

  // ═════════════════════════════════════════════════════════════════════════
  // LẤY SƠ ĐỒ GHẾ
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Lấy sơ đồ ghế với trạng thái real-time
   * Trả về mảng Seat với status hiện tại từ Redis
   */
  async getSeatMap(tripId, seatLayout) {
    if (!tripId) {
      throw new Error('tripId là bắt buộc.');
    }

    const seats = await seatRepository.getSeatMap(tripId, seatLayout);
    return { tripId, seats };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // GIỮ GHẾ (AVAILABLE → HELD)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Giữ ghế tạm thời bằng cơ chế SETNX atomic
   *
   * Sau khi hold thành công → publish sự kiện để:
   * - Frontend của các user khác đang xem cùng chuyến thấy ghế chuyển màu
   *
   * @returns {{ success, message, ttl? }}
   */
  async holdSeat(tripId, seatId, userId) {
    if (!tripId || !seatId) {
      throw new Error('tripId và seatId là bắt buộc.');
    }

    const result = await seatRepository.holdSeat(tripId, seatId, userId);

    if (result.success) {
      // Lấy seatNumber để publish sự kiện (seatNumber = phần sau dấu gạch dưới cuối)
      const seatNumber = seatId.includes(`${tripId}_`)
        ? seatId.replace(`${tripId}_`, '')
        : seatId;

      // Publish sự kiện KHÔNG đồng bộ — không await để không làm chậm response
      redisPubSub.publishSeatStatusChange(tripId, seatId, seatNumber, 'HELD').catch(() => {});
    }

    return {
      success: result.success,
      message: result.message || (result.success
        ? `Đã giữ ghế thành công. Bạn có ${result.ttl} giây để hoàn tất thanh toán.`
        : 'Không thể giữ ghế.'),
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // NHẢ GHẾ (HELD → AVAILABLE)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Nhả ghế chủ động (khách hủy hoặc booking expired)
   */
  async releaseSeat(tripId, seatId, userId) {
    if (!tripId || !seatId) {
      throw new Error('tripId và seatId là bắt buộc.');
    }

    const result = await seatRepository.releaseSeat(tripId, seatId, userId);

    if (result.success) {
      const seatNumber = seatId.includes(`${tripId}_`)
        ? seatId.replace(`${tripId}_`, '')
        : seatId;

      redisPubSub.publishSeatStatusChange(tripId, seatId, seatNumber, 'AVAILABLE').catch(() => {});
    }

    return result;
  },

  /**
   * Nhả ghế bởi hệ thống (không cần kiểm tra userId)
   * Dùng khi: booking EXPIRED, admin force release
   */
  async forceReleaseSeat(tripId, seatId) {
    const result = await seatRepository.forceReleaseSeat(tripId, seatId);

    const seatNumber = seatId.includes(`${tripId}_`)
      ? seatId.replace(`${tripId}_`, '')
      : seatId;

    redisPubSub.publishSeatStatusChange(tripId, seatId, seatNumber, 'AVAILABLE').catch(() => {});
    return result;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // CHỐT GHẾ (HELD → BOOKED) — Sau khi thanh toán thành công
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Chốt ghế vĩnh viễn sau thanh toán thành công
   * Được gọi bởi booking-service qua gRPC sau khi payment confirmed
   */
  async bookSeat(tripId, seatId, userId, bookingId) {
    if (!tripId || !seatId || !bookingId) {
      throw new Error('tripId, seatId và bookingId là bắt buộc.');
    }

    const result = await seatRepository.bookSeat(tripId, seatId, userId, bookingId);

    if (result.success) {
      const seatNumber = seatId.includes(`${tripId}_`)
        ? seatId.replace(`${tripId}_`, '')
        : seatId;

      redisPubSub.publishSeatStatusChange(tripId, seatId, seatNumber, 'BOOKED').catch(() => {});
    }

    return result;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // BLOCK / UNBLOCK (Admin)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Admin khóa ghế (AVAILABLE → BLOCKED)
   * Theo đặc tả: chỉ khóa được ghế AVAILABLE, không được khóa ghế HELD/BOOKED
   */
  async blockSeat(tripId, seatId, reason) {
    const result = await seatRepository.blockSeat(tripId, seatId, reason);

    if (result.success) {
      const seatNumber = seatId.includes(`${tripId}_`)
        ? seatId.replace(`${tripId}_`, '')
        : seatId;

      redisPubSub.publishSeatStatusChange(tripId, seatId, seatNumber, 'BLOCKED').catch(() => {});
    }

    return result;
  },

  /**
   * Admin mở khóa ghế (BLOCKED → AVAILABLE)
   */
  async unblockSeat(tripId, seatId) {
    const result = await seatRepository.unblockSeat(tripId, seatId);

    if (result.success) {
      const seatNumber = seatId.includes(`${tripId}_`)
        ? seatId.replace(`${tripId}_`, '')
        : seatId;

      redisPubSub.publishSeatStatusChange(tripId, seatId, seatNumber, 'AVAILABLE').catch(() => {});
    }

    return result;
  },
};

module.exports = seatService;
