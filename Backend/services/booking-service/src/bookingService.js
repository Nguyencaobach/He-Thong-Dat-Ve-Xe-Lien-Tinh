/**
 * bookingService.js - Tầng nghiệp vụ điều phối Saga đặt vé
 *
 * ═══ LUỒNG SAGA (Choreography pattern — Đặc tả 6.4) ══════════════════════
 *
 * createBooking():
 *   1. Gọi gRPC HoldSeat → seat-service (giữ ghế)
 *   2. Nếu hold thành công → tạo booking PENDING_PAYMENT trong DB
 *   3. Trả booking về cho frontend ngay (không chờ payment)
 *
 * confirmPayment() — được gọi sau khi payment-service notify qua RabbitMQ:
 *   1. Nhận event "payment.succeeded" từ RabbitMQ
 *   2. Gọi gRPC BookSeat → seat-service (chốt ghế HELD → BOOKED)
 *   3. Chuyển booking PENDING_PAYMENT → PAID
 *   4. Ghi outbox_event "booking.paid" để outboxWorker publish
 *
 * cancelBooking():
 *   1. Validate trạng thái có thể cancel
 *   2. Gọi ReleaseSeat → seat-service (nhả ghế)
 *   3. Chuyển booking → CANCELLED
 *
 * ════════════════════════════════════════════════════════════════════════════
 */
const bookingRepository = require('./bookingRepository');
const outboxEventRepository = require('./outboxEventRepository');
const { clients, seatClient } = require('./grpcClients');
const grpc = require('@grpc/grpc-js');
const db = require('./db');
require('dotenv').config();

const BOOKING_PENDING_TTL = parseInt(process.env.BOOKING_PENDING_TTL) || 300; // giây

const bookingService = {

  // ═════════════════════════════════════════════════════════════════════════
  // TASK-03: TẠO BOOKING MỚI
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Tạo booking: giữ ghế → tạo đơn PENDING_PAYMENT
   *
   * Đặc tả 5.4: booking-service gọi gRPC HoldSeat tới seat-service
   * Nếu HoldSeat thất bại → trả lỗi ngay, không tạo booking
   */
  async createBooking({ userId, tripId, seatIds, passengers, totalAmount }) {
    const effectiveUserId = userId || 'guest';

    // Bước 1: Giữ ghế (một ghế một lần theo proto hiện tại)
    // Nếu có nhiều ghế, thực hiện tuần tự — ghế nào thất bại thì nhả các ghế trước
    const heldSeats = [];
    for (const seatId of seatIds) {
      try {
        const result = await clients.seat.HoldSeat({
          tripId,
          seatId,
          userId: effectiveUserId,
        });

        if (!result.success) {
          // Rollback: nhả các ghế đã giữ thành công trước đó
          await _releaseSeats(tripId, heldSeats, effectiveUserId);
          throw new Error(`Không thể giữ ghế ${seatId}: ${result.message}`);
        }

        heldSeats.push(seatId);
      } catch (err) {
        // gRPC lỗi kết nối hoặc lỗi service
        await _releaseSeats(tripId, heldSeats, effectiveUserId);
        throw new Error(`Lỗi khi giữ ghế ${seatId}: ${err.message}`);
      }
    }

    // Fetch real price from trip-service
    let seatPrice = 200000;
    try {
      const tripDetails = await clients.trip.GetTripDetails({ tripId });
      if (tripDetails && tripDetails.price) {
        seatPrice = tripDetails.price;
      }
    } catch (err) {
      console.warn(`[booking-service] Không thể lấy giá từ trip-service cho trip ${tripId}, dùng giá mặc định: ${err.message}`);
    }

    // Bước 2: Tạo booking trong DB với trạng thái PENDING_PAYMENT
    const expiresAt = new Date(Date.now() + BOOKING_PENDING_TTL * 1000);

    const booking = await bookingRepository.createBooking({
      userId: effectiveUserId,
      tripId,
      seatIds,
      totalAmount: seatIds.length * seatPrice,
      passengers:  passengers || [],
      expiresAt,
    });

    console.log(`[booking-service] Tạo booking ${booking.id} | trip=${tripId} | seats=${seatIds.join(',')} | expires=${expiresAt.toISOString()}`);

    return booking;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TASK-06: XÁC NHẬN THANH TOÁN THÀNH CÔNG (PENDING_PAYMENT → PAID)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Được gọi khi nhận event "payment.succeeded" từ RabbitMQ
   * Đặc tả 6.3 điểm 5: Booking Service xác nhận ghế với Seat Inventory Service
   */
  async confirmPaymentSuccess({ bookingId, transactionId, paymentMethod }) {
    const booking = await bookingRepository.findWithPassengers(bookingId);
    if (!booking) {
      throw new Error(`Không tìm thấy booking: ${bookingId}`);
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      console.warn(`[booking-service] confirmPaymentSuccess: booking ${bookingId} đang ở trạng thái ${booking.status}, bỏ qua.`);
      return booking;
    }

    // Lấy thông tin chuyến đi từ trip-service để truyền sang ticket-worker
    let tripInfo = {};
    try {
      const tripDetails = await clients.trip.GetTripDetails(
        { tripId: booking.trip_id },
        new grpc.Metadata()
      );
      tripInfo = tripDetails.trip || tripDetails;
    } catch (err) {
      console.warn(`[booking-service] Không thể lấy tripInfo cho booking ${bookingId}:`, err.message);
    }

    // Bước 1: Chốt ghế vĩnh viễn (HELD → BOOKED) tại seat-service
    for (const seatId of booking.seat_ids) {
      try {
        const metadata = new grpc.Metadata();
        metadata.add('booking-id', bookingId);
        metadata.add('user-id', booking.user_id);

        const result = await clients.seat.BookSeat(
          { tripId: booking.trip_id, seatId },
          metadata
        );

        if (!result.success) {
          console.error(`[booking-service] BookSeat thất bại cho ${seatId}: ${result.message}`);
          // Compensating: chuyển booking sang CANCELLED nếu chốt ghế thất bại
          await bookingRepository.transition(bookingId, 'CANCELLED');
          throw new Error(`Không thể chốt ghế ${seatId}: ${result.message}`);
        }
      } catch (err) {
        throw new Error(`Lỗi chốt ghế ${seatId}: ${err.message}`);
      }
    }

    // Bước 2: Dùng transaction DB: cập nhật booking PAID + ghi outbox event
    await db.transaction(async (trx) => {
      await trx('bookings')
        .where({ id: bookingId })
        .update({
          status:         'PAID',
          payment_method: paymentMethod || 'unknown',
          paid_at:        trx.fn.now(),
          updated_at:     trx.fn.now(),
        });

      // TASK-07: Ghi outbox event "booking.paid" để publish lên RabbitMQ + Kafka
      await trx('outbox_events').insert({
        event_type: 'booking.paid',
        payload: JSON.stringify({
          bookingId,
          userId:        booking.user_id,
          tripId:        booking.trip_id,
          seatIds:       booking.seat_ids,
          totalAmount:   booking.total_amount,
          passengers:    booking.passengers,
          tripInfo:      tripInfo,
          transactionId,
          paymentMethod,
          paidAt:        new Date().toISOString(),
        }),
        status: 'pending',
      });
    });

    console.log(`[booking-service] ✓ Booking ${bookingId} → PAID (transaction=${transactionId})`);
    return bookingRepository.findWithPassengers(bookingId);
  },

  /**
   * Xử lý thanh toán thất bại: chuyển booking → EXPIRED và nhả ghế
   */
  async handlePaymentFailed({ bookingId }) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking || booking.status !== 'PENDING_PAYMENT') return;

    // Không chuyển sang EXPIRED ngay lập tức, cho phép khách hàng thanh toán lại
    // cho đến khi worker quét TTL tự động hết hạn.
    console.log(`[booking-service] Giao dịch thanh toán thất bại cho booking ${bookingId} (vẫn giữ PENDING_PAYMENT)`);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // HỦY BOOKING
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Khách hủy booking (chỉ được khi status PENDING_PAYMENT hoặc PAID)
   */
  async cancelBooking({ bookingId, userId }) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new Error(`Không tìm thấy booking: ${bookingId}`);

    // Chỉ cho phép user sở hữu booking hủy (trừ admin)
    if (booking.user_id !== userId && userId !== 'admin') {
      throw new Error('Bạn không có quyền hủy booking này.');
    }

    if (!['PENDING_PAYMENT', 'PAID'].includes(booking.status)) {
      throw new Error(`Không thể hủy booking ở trạng thái ${booking.status}.`);
    }

    // Nhả ghế bất kể là PENDING (đang HELD) hay PAID (đã BOOKED)
    await _releaseSeats(booking.trip_id, booking.seat_ids, booking.user_id);

    const updated = await bookingRepository.transition(bookingId, 'CANCELLED');
    console.log(`[booking-service] Booking ${bookingId} → CANCELLED (by ${userId})`);
    return updated;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // LẤY THÔNG TIN BOOKING
  // ═════════════════════════════════════════════════════════════════════════

  async getBooking(bookingId) {
    const booking = await bookingRepository.findWithPassengers(bookingId);
    if (!booking) throw new Error(`Không tìm thấy booking: ${bookingId}`);
    return booking;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // HẾT HẠN THANH TOÁN (được trigger bởi seat-service TTL expired event)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Tự động expire các booking PENDING_PAYMENT đã quá hạn
   * Được gọi định kỳ hoặc khi nhận keyspace notification từ seat-service
   */
  async expireStaleBookings() {
    const expired = await bookingRepository.findExpiredPendingBookings();
    for (const booking of expired) {
      try {
        // Luôn chủ động gọi ReleaseSeat để nhả ghế và force update pubsub 
        // đề phòng trường hợp Redis TTL bị miss khi server đang sập
        await _releaseSeats(booking.trip_id, booking.seat_ids, booking.user_id);
        
        await bookingRepository.expireBooking(booking.id);
        console.log(`[booking-service] Booking ${booking.id} → EXPIRED (timeout)`);
      } catch (err) {
        console.error(`[booking-service] Lỗi expire booking ${booking.id}:`, err.message);
      }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // LIST BOOKINGS BY USER
  // ═════════════════════════════════════════════════════════════════════════
  async listBookingsByUser(userId, limit = 50) {
    const bookings = await bookingRepository.findByUserId(userId, limit);
    // Enrich each booking with passengers
    const enriched = [];
    for (const booking of bookings) {
      const full = await bookingRepository.findWithPassengers(booking.id);
      enriched.push(full);
    }
    return enriched;
  },
};

// ── Helper: nhả nhiều ghế ────────────────────────────────────────────────────
async function _releaseSeats(tripId, seatIds, userId) {
  for (const seatId of seatIds) {
    try {
      const metadata = new grpc.Metadata();
      metadata.add('user-id', userId);
      await new Promise((resolve) => {
        seatClient.ReleaseSeat(
          { tripId, seatId },
          metadata,
          (err, res) => resolve(res) // Không reject — best effort
        );
      });
    } catch (err) {
      console.warn(`[booking-service] Không thể nhả ghế ${seatId}:`, err.message);
    }
  }
}

module.exports = bookingService;
