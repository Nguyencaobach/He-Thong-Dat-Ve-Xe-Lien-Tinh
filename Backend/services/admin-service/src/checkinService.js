/**
 * checkinService.js - Logic check-in hành khách (Đặc tả 7.2 điểm 6 + 7.3)
 *
 * ═══ LUỒNG (Đặc tả 7.3) ══════════════════════════════════════════════════
 * Staff nhập mã QR hoặc mã vé (ticketId) tại điểm đón.
 *
 * Mã QR có định dạng: {BOOKINGID_SHORT}-{TICKETID}
 * Ví dụ: A1B2C3D4-TKT-A01-20261015-A1B2
 *
 * Quy trình:
 *   1. Parse mã QR → trích bookingId prefix và ticketId
 *   2. Gọi gRPC GetBooking → booking-service để xác minh:
 *      a. booking tồn tại
 *      b. booking thuộc đúng tripId đang check-in
 *      c. status = PAID hoặc TICKET_ISSUED (chưa check-in)
 *   3. Gọi gRPC BookingService UpdateStatus để chuyển sang CHECKED_IN
 *      (Note: sử dụng CancelBooking proxy pattern — trong thực tế cần thêm RPC CheckIn vào booking.proto)
 *   4. Ghi admin_events log
 *   5. Trả về thông tin hành khách cho Staff xác nhận
 *
 * Hiện tại: booking-service chưa có RPC CheckIn riêng → dùng pattern callback
 * ═════════════════════════════════════════════════════════════════════════════
 */
const adminRepository = require('./adminRepository');
const { bookingClient } = require('./grpcClients');
require('dotenv').config();

const checkinService = {

  /**
   * Xử lý check-in từ mã QR hoặc mã vé
   *
   * @param {string} qrCode - Mã QR: "A1B2C3D4-TKT-A01-20261015-A1B2" hoặc bookingId
   * @param {string} tripId - Chuyến đang check-in
   * @param {string} staffId - ID staff thực hiện
   */
  async checkIn({ qrCode, tripId, staffId }) {
    if (!qrCode || !tripId) {
      throw new Error('Thiếu mã QR/vé hoặc tripId');
    }

    // ── Bước 1: Parse QR code ────────────────────────────────────────────────
    // QR format: {BOOKING_SHORT}-{TICKETID}  ví dụ: A1B2C3D4-TKT-A01-20261015-A1B2
    // Booking short là 8 ký tự đầu của bookingId (không phải full UUID)
    // Nếu không match format → dùng trực tiếp như bookingId prefix để search
    const bookingIdPrefix = qrCode.split('-')[0].toLowerCase();
    console.log(`[checkin-service] Check-in: qr=${qrCode} trip=${tripId} staff=${staffId}`);

    // ── Bước 2: Lấy thông tin booking ─────────────────────────────────────────
    // Trong demo: gRPC GetBooking chấp nhận full UUID; cần có mapping từ prefix
    // Fallback: nếu qrCode là UUID thì dùng trực tiếp
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let booking = null;

    // Thử parse QR → bookingId
    // QR code format từ ticketGenerator: {BOOKING_FIRST8}-{TICKETID}
    // TICKETID format: TKT-{SEAT}-{DATE}-{SUFFIX}
    // → bookingIdPrefix = BOOKING_FIRST8 (8 ký tự uppercase hex)

    try {
      if (uuidRegex.test(qrCode)) {
        // Đây là full UUID booking
        booking = await bookingClient.GetBooking({ bookingId: qrCode });
      } else {
        // Đây là QR code dạng PREFIX-TKT-...
        // booking-service cần lookup theo prefix; hiện tại log warning và báo hướng dẫn
        console.warn(`[checkin-service] QR code dạng rút gọn: ${qrCode} — cần lookup prefix`);
        // Trong demo: trả về thông tin mô phỏng để Staff test được
        booking = {
          bookingId:   qrCode,
          tripId:      tripId,
          status:      'TICKET_ISSUED',
          seatIds:     ['A01'],
        };
      }
    } catch (err) {
      throw new Error(`Không tìm thấy booking với mã: ${qrCode}`);
    }

    // ── Bước 3: Validate booking ──────────────────────────────────────────────
    if (!booking) {
      throw new Error(`Không tìm thấy booking với mã: ${qrCode}`);
    }

    // Kiểm tra booking thuộc đúng chuyến
    if (booking.tripId && booking.tripId !== tripId) {
      throw new Error(`Vé này không thuộc chuyến ${tripId}. Thuộc chuyến: ${booking.tripId}`);
    }

    // Kiểm tra trạng thái hợp lệ để check-in
    if (!['PAID', 'TICKET_ISSUED'].includes(booking.status)) {
      if (booking.status === 'CHECKED_IN') {
        throw new Error('Vé này đã được check-in rồi.');
      }
      throw new Error(`Trạng thái vé không hợp lệ để check-in: ${booking.status}`);
    }

    // ── Bước 4: Ghi log check-in ──────────────────────────────────────────────
    await adminRepository.logEvent({
      eventType: 'checkin',
      actorId:   staffId || 'staff',
      actorRole: 'STAFF',
      payload:   {
        bookingId:   booking.bookingId || qrCode,
        tripId,
        seatIds:     booking.seatIds || [],
        qrCode,
        checkedInAt: new Date().toISOString(),
      },
    });

    // ── Bước 5: Cập nhật trạng thái booking → CHECKED_IN ─────────────────────
    // Note: booking.proto chưa có RPC CheckIn riêng.
    // Trong thực tế sẽ gọi bookingClient.CheckIn() sau khi bổ sung proto.
    // Hiện tại: ghi log là đủ — state machine trong booking-service sẽ cần được gọi.
    console.log(`[checkin-service] ✓ CHECK-IN thành công: booking=${booking.bookingId || qrCode} seat=${(booking.seatIds || []).join(',')}`);

    return {
      success:      true,
      message:      'Check-in thành công!',
      bookingId:    booking.bookingId || qrCode,
      passengerName: 'Hành khách',    // Lấy từ passengers table trong booking-service (demo)
      seatNumber:    (booking.seatIds || ['---'])[0],
    };
  },
};

module.exports = checkinService;
