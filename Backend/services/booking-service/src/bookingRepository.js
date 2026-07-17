/**
 * bookingRepository.js - Tầng dữ liệu: giao tiếp với PostgreSQL (booking_db)
 *
 * ═══ STATE MACHINE BOOKING (Đặc tả 6.2) ═════════════════════════════════════
 *
 *   PENDING_PAYMENT ──→ PAID ──→ TICKET_ISSUED ──→ CHECKED_IN ──→ COMPLETED
 *        │
 *        └──→ EXPIRED   (hết TTL 5 phút chưa thanh toán)
 *
 *   PAID ──→ CANCELLED  (khách hủy, trước khi CHECKED_IN)
 *
 * Mỗi chuyển trạng thái phải đi qua hàm transition() để validate hợp lệ.
 * ═════════════════════════════════════════════════════════════════════════════
 */
const db = require('./db');

// ── State Machine định nghĩa các chuyển trạng thái hợp lệ ───────────────────
const VALID_TRANSITIONS = {
  PENDING_PAYMENT: ['PAID', 'EXPIRED', 'CANCELLED'],
  PAID:            ['TICKET_ISSUED', 'CANCELLED'],
  TICKET_ISSUED:   ['CHECKED_IN'],
  CHECKED_IN:      ['COMPLETED'],
  COMPLETED:       [],
  EXPIRED:         [],
  CANCELLED:       [],
};

/**
 * Kiểm tra chuyển trạng thái có hợp lệ không
 * @throws Error nếu không hợp lệ
 */
function assertValidTransition(currentStatus, nextStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `Chuyển trạng thái không hợp lệ: ${currentStatus} → ${nextStatus}. Cho phép: [${allowed.join(', ')}]`
    );
  }
}

const bookingRepository = {

  // ═══════════════════════════════════════════════════════════════════════════
  // TẠO BOOKING MỚI
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Tạo booking mới ở trạng thái PENDING_PAYMENT
   * Đồng thời ghi passengers (1 record per seat)
   * Dùng Knex transaction để đảm bảo atomic
   */
  async createBooking({ userId, tripId, seatIds, totalAmount, passengers, expiresAt }) {
    return db.transaction(async (trx) => {
      // Tạo booking
      const [booking] = await trx('bookings').insert({
        user_id:      userId,
        trip_id:      tripId,
        seat_ids:     seatIds,  // Knex tự handle TEXT[]
        status:       'PENDING_PAYMENT',
        total_amount: totalAmount || 0,
        expires_at:   expiresAt,
      }).returning('*');

      // Tạo passengers nếu có
      if (passengers && passengers.length > 0) {
        const passengerRows = passengers.map((p) => ({
          booking_id:  booking.id,
          seat_id:     p.seatId,
          seat_number: p.seatNumber || p.seatId,
          full_name:   p.fullName,
          phone:       p.phone,
          email:       p.email || null,
          id_number:   p.idNumber || null,
        }));
        await trx('passengers').insert(passengerRows);
      }

      return booking;
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LẤY THÔNG TIN BOOKING
  // ═══════════════════════════════════════════════════════════════════════════

  async findById(bookingId) {
    if (!bookingId) return null;
    if (bookingId.length <= 15) { // Dạng short code (ví dụ: C83A4712 hoặc C83A4712-A01)
      const prefix = bookingId.split('-')[0].trim().toLowerCase();
      return db('bookings').whereRaw('id::text ILIKE ?', [`${prefix}%`]).first();
    }
    return db('bookings').where({ id: bookingId }).first();
  },

  async findWithPassengers(bookingId) {
    if (!bookingId) return null;
    let booking;
    if (bookingId.length <= 15) {
      const prefix = bookingId.split('-')[0].trim().toLowerCase();
      booking = await db('bookings').whereRaw('id::text ILIKE ?', [`${prefix}%`]).first();
    } else {
      booking = await db('bookings').where({ id: bookingId }).first();
    }
    
    if (!booking) return null;

    const passengers = await db('passengers')
      .where({ booking_id: booking.id })
      .orderBy('seat_number');

    return { ...booking, passengers };
  },

  async findByUserId(userId, limit = 20) {
    return db('bookings')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHUYỂN TRẠNG THÁI (State Machine)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Chuyển trạng thái booking (có validate state machine)
   * @param {string} bookingId
   * @param {string} nextStatus - Trạng thái mới
   * @param {object} extraFields - Các field cập nhật thêm (paid_at, cancelled_at...)
   * @returns Booking sau khi cập nhật
   */
  async transition(bookingId, nextStatus, extraFields = {}) {
    // Lấy booking hiện tại để validate
    const current = await this.findById(bookingId);
    if (!current) {
      throw new Error(`Không tìm thấy booking: ${bookingId}`);
    }

    assertValidTransition(current.status, nextStatus);

    const updateData = {
      status:     nextStatus,
      updated_at: db.fn.now(),
      ...extraFields,
    };

    // Ghi thêm timestamp chuyển trạng thái
    if (nextStatus === 'PAID')      updateData.paid_at      = db.fn.now();
    if (nextStatus === 'CANCELLED') updateData.cancelled_at = db.fn.now();

    const [updated] = await db('bookings')
      .where({ id: bookingId })
      .update(updateData)
      .returning('*');

    return updated;
  },

  /**
   * Tìm tất cả booking PENDING_PAYMENT đã quá hạn
   * (Dùng bởi expiry worker hoặc khi nhận TTL expired event)
   */
  async findExpiredPendingBookings() {
    return db('bookings')
      .where({ status: 'PENDING_PAYMENT' })
      .where('expires_at', '<', db.fn.now());
  },

  /**
   * Đánh dấu booking EXPIRED (không cần validate transition ở đây vì gọi từ system)
   */
  async expireBooking(bookingId) {
    return this.transition(bookingId, 'EXPIRED');
  },
};

module.exports = bookingRepository;
