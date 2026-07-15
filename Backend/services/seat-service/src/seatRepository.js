/**
 * seatRepository.js - Tầng dữ liệu: Giao tiếp với Redis để quản lý trạng thái ghế
 *
 * ═══ THIẾT KẾ KEY REDIS ═══════════════════════════════════════════════════════
 *
 * 1. Ghế đang bị HOLD (tạm giữ):
 *    Key:   hold:{tripId}:{seatId}
 *    Value: { userId, heldAt }        (JSON string)
 *    TTL:   SEAT_HOLD_TTL giây (mặc định 300 giây = 5 phút)
 *    → Khi TTL hết, Redis tự xóa key → ghế tự động về AVAILABLE
 *
 * 2. Ghế đã BOOKED (đã thanh toán, vĩnh viễn):
 *    Key:   booked:{tripId}:{seatId}
 *    Value: { userId, bookingId, bookedAt }  (JSON string)
 *    TTL:   Không có TTL (vĩnh viễn cho đến khi trip kết thúc)
 *
 * 3. Ghế bị BLOCKED (admin khóa, không bán):
 *    Key:   blocked:{tripId}:{seatId}
 *    Value: { blockedAt, reason }       (JSON string)
 *    TTL:   Không có TTL (do admin mở khóa thủ công)
 *
 * 4. Danh sách tất cả seat của một trip (dùng để GET sơ đồ ghế):
 *    Key:   seatmap:{tripId}
 *    Value: JSON array [ { seatId, seatNumber, floor, type } ]
 *    TTL:   Không TTL (dữ liệu cố định theo loại xe)
 *
 * ═══ CHIẾN LƯỢC ATOMIC SETNX ════════════════════════════════════════════════
 * Thay vì: GET → check → SET (3 lệnh, có thể race condition giữa các bước)
 * Dùng:    SET key value NX EX ttl  (1 lệnh atomic, Redis đảm bảo)
 * → Nếu key chưa tồn tại: SET thành công, trả "OK"
 * → Nếu key đã tồn tại:   SET thất bại, trả null
 * → Chỉ một trong hai kết quả, không bao giờ cả hai đều thành công
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { redis } = require('./redisClient');
require('dotenv').config();

const SEAT_HOLD_TTL = parseInt(process.env.SEAT_HOLD_TTL) || 300; // 5 phút

// ── Helpers tạo key Redis ─────────────────────────────────────────────────────
const keys = {
  hold:    (tripId, seatId) => `hold:${tripId}:${seatId}`,
  booked:  (tripId, seatId) => `booked:${tripId}:${seatId}`,
  blocked: (tripId, seatId) => `blocked:${tripId}:${seatId}`,
  seatmap: (tripId)         => `seatmap:${tripId}`,
};

const seatRepository = {

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK-03: GIỮ GHẾ ATOMIC (SETNX)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Giữ ghế nguyên tử bằng SET...NX EX
   *
   * SET hold:{tripId}:{seatId} {value} NX EX {ttl}
   * NX = "chỉ set nếu key KHÔNG tồn tại" — đây là chìa khóa atomic
   * EX = "hết hạn sau N giây" — ghế tự nhả khi hết TTL
   *
   * @returns {{ success: boolean, ttl?: number }}
   *   success = true  → ghế được giữ thành công
   *   success = false → ghế đang bị HELD / BOOKED / BLOCKED bởi người khác
   */
  async holdSeat(tripId, seatId, userId) {
    const holdKey = keys.hold(tripId, seatId);
    const bookedKey = keys.booked(tripId, seatId);
    const blockedKey = keys.blocked(tripId, seatId);

    // Trước hết kiểm tra ghế có đang BOOKED hoặc BLOCKED không (không thể giữ được)
    const [isBooked, isBlocked] = await Promise.all([
      redis.exists(bookedKey),
      redis.exists(blockedKey),
    ]);

    if (isBooked) {
      return { success: false, reason: 'BOOKED', message: 'Ghế này đã được đặt (BOOKED).' };
    }
    if (isBlocked) {
      return { success: false, reason: 'BLOCKED', message: 'Ghế này đang bị khóa (BLOCKED) bởi Admin.' };
    }

    // Atomic SETNX: chỉ set nếu key chưa tồn tại
    // Redis lệnh: SET key value NX EX seconds
    const value = JSON.stringify({
      userId,
      heldAt: new Date().toISOString(),
      tripId,
      seatId,
    });

    // set(key, value, 'EX', ttl, 'NX') trả về 'OK' nếu thành công, null nếu thất bại
    const result = await redis.set(holdKey, value, 'EX', SEAT_HOLD_TTL, 'NX');

    if (result === 'OK') {
      console.log(`[seat-repo] HOLD SUCCESS: ${holdKey} (TTL=${SEAT_HOLD_TTL}s, user=${userId})`);
      return { success: true, ttl: SEAT_HOLD_TTL };
    } else {
      // Ghế đang bị HELD bởi người khác
      console.log(`[seat-repo] HOLD FAILED (already held): ${holdKey}`);
      return { success: false, reason: 'HELD', message: 'Ghế đang được người khác giữ. Vui lòng chọn ghế khác.' };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK-04: NHẢ GHẾ (Release)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Nhả ghế chủ động (khách hủy hoặc hết hạn thanh toán booking)
   *
   * Chỉ nhả được nếu hold key đang thuộc về đúng userId.
   * Tránh tình trạng người A nhả ghế của người B.
   *
   * @returns {{ success: boolean, message: string }}
   */
  async releaseSeat(tripId, seatId, userId) {
    const holdKey = keys.hold(tripId, seatId);
    const raw = await redis.get(holdKey);

    if (!raw) {
      // Ghế không đang ở trạng thái HELD (đã hết TTL hoặc chưa giữ)
      return { success: true, message: 'Ghế không còn trong trạng thái HELD (có thể đã hết TTL).' };
    }

    const holdData = JSON.parse(raw);

    if (holdData.userId !== userId) {
      // Bảo vệ: không cho người này nhả ghế của người khác
      return { success: false, message: `Không thể nhả ghế: ghế đang được giữ bởi user khác.` };
    }

    await redis.del(holdKey);
    console.log(`[seat-repo] RELEASE SUCCESS: ${holdKey} (user=${userId})`);
    return { success: true, message: 'Nhả ghế thành công.' };
  },

  /**
   * Nhả ghế bởi hệ thống (admin force release, không cần kiểm tra userId)
   * Dùng khi booking EXPIRED hoặc khi admin cần can thiệp.
   */
  async forceReleaseSeat(tripId, seatId) {
    const holdKey = keys.hold(tripId, seatId);
    const deleted = await redis.del(holdKey);
    console.log(`[seat-repo] FORCE RELEASE: ${holdKey} (deleted=${deleted})`);
    return { success: true, deleted: deleted > 0 };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK-05: CHỐT GHẾ VĨNH VIỄN (Book)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Chốt ghế vĩnh viễn sau khi thanh toán thành công (HELD → BOOKED)
   *
   * Luồng:
   * 1. Kiểm tra hold key còn tồn tại không (đề phòng TTL đã hết)
   * 2. Xóa hold key
   * 3. Tạo booked key (không có TTL — vĩnh viễn)
   *
   * @returns {{ success: boolean, message: string }}
   */
  async bookSeat(tripId, seatId, userId, bookingId) {
    const holdKey   = keys.hold(tripId, seatId);
    const bookedKey = keys.booked(tripId, seatId);

    // Kiểm tra hold key còn không
    const raw = await redis.get(holdKey);
    if (!raw) {
      // Hold đã hết hạn — không thể chốt
      console.warn(`[seat-repo] BOOK FAILED: hold key expired: ${holdKey}`);
      return { success: false, message: 'Phiên giữ ghế đã hết hạn. Vui lòng thử lại từ đầu.' };
    }

    // Dùng pipeline để xóa hold key và tạo booked key trong cùng 1 round-trip
    const pipeline = redis.pipeline();
    pipeline.del(holdKey);
    pipeline.set(
      bookedKey,
      JSON.stringify({ userId, bookingId, bookedAt: new Date().toISOString(), tripId, seatId })
    );
    await pipeline.exec();

    console.log(`[seat-repo] BOOK SUCCESS: ${bookedKey} (booking=${bookingId})`);
    return { success: true, message: 'Chốt ghế thành công.' };
  },

  /**
   * Chốt ghế trực tiếp không qua hold (dùng cho trường hợp admin đặt lịch)
   * Kiểm tra trước: nếu ghế đang HELD hoặc BLOCKED thì từ chối.
   */
  async bookSeatDirect(tripId, seatId, userId, bookingId) {
    const holdKey    = keys.hold(tripId, seatId);
    const bookedKey  = keys.booked(tripId, seatId);
    const blockedKey = keys.blocked(tripId, seatId);

    const [isHeld, isBlocked, isBooked] = await Promise.all([
      redis.exists(holdKey),
      redis.exists(blockedKey),
      redis.exists(bookedKey),
    ]);

    if (isHeld || isBlocked || isBooked) {
      return { success: false, message: 'Ghế không ở trạng thái AVAILABLE để đặt trực tiếp.' };
    }

    await redis.set(
      bookedKey,
      JSON.stringify({ userId, bookingId, bookedAt: new Date().toISOString(), tripId, seatId })
    );

    return { success: true, message: 'Chốt ghế thành công.' };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCK / UNBLOCK (Admin khóa ghế không bán)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Admin khóa ghế (AVAILABLE → BLOCKED)
   * Không thể khóa ghế đang HELD hoặc BOOKED.
   */
  async blockSeat(tripId, seatId, reason = '') {
    const holdKey    = keys.hold(tripId, seatId);
    const bookedKey  = keys.booked(tripId, seatId);
    const blockedKey = keys.blocked(tripId, seatId);

    const [isHeld, isBooked] = await Promise.all([
      redis.exists(holdKey),
      redis.exists(bookedKey),
    ]);

    // Đặc tả: không khóa ghế đang HELD/BOOKED
    if (isHeld) {
      return { success: false, message: 'Không thể khóa ghế đang ở trạng thái HELD.' };
    }
    if (isBooked) {
      return { success: false, message: 'Không thể khóa ghế đã BOOKED.' };
    }

    await redis.set(
      blockedKey,
      JSON.stringify({ blockedAt: new Date().toISOString(), reason })
    );
    return { success: true, message: 'Ghế đã bị khóa (BLOCKED).' };
  },

  /**
   * Admin mở khóa ghế (BLOCKED → AVAILABLE)
   */
  async unblockSeat(tripId, seatId) {
    const blockedKey = keys.blocked(tripId, seatId);
    const deleted = await redis.del(blockedKey);
    return {
      success: deleted > 0,
      message: deleted > 0 ? 'Ghế đã được mở khóa (AVAILABLE).' : 'Ghế không ở trạng thái BLOCKED.',
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LẤY TRẠNG THÁI GHẾ
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lấy trạng thái hiện tại của một ghế
   * @returns {'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED'}
   */
  async getSeatStatus(tripId, seatId) {
    const [isHeld, isBooked, isBlocked] = await Promise.all([
      redis.exists(keys.hold(tripId, seatId)),
      redis.exists(keys.booked(tripId, seatId)),
      redis.exists(keys.blocked(tripId, seatId)),
    ]);

    if (isBooked)  return 'BOOKED';
    if (isBlocked) return 'BLOCKED';
    if (isHeld)    return 'HELD';
    return 'AVAILABLE';
  },

  /**
   * Lấy TTL còn lại của ghế đang HELD (tính bằng giây)
   * @returns {number} Giây còn lại, -1 nếu không có TTL, -2 nếu key không tồn tại
   */
  async getHoldTTL(tripId, seatId) {
    return redis.ttl(keys.hold(tripId, seatId));
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SƠ ĐỒ GHẾ (SeatMap)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lấy toàn bộ sơ đồ ghế của một chuyến với trạng thái real-time
   *
   * Luồng:
   * 1. Lấy danh sách ghế từ seatmap:{tripId} (dữ liệu cố định theo loại xe)
   * 2. Với mỗi ghế, check 3 key Redis (hold, booked, blocked) để lấy status
   * 3. Trả về mảng Seat với status đã cập nhật
   *
   * Performance: Dùng pipeline để gom tất cả lệnh EXISTS vào 1 round-trip
   */
  async getSeatMap(tripId) {
    const seatmapKey = keys.seatmap(tripId);
    const raw = await redis.get(seatmapKey);

    // Nếu chưa có seatmap trong Redis → sinh mặc định cho demo
    const seats = raw ? JSON.parse(raw) : generateDefaultSeatMap(tripId);

    if (!raw) {
      // Cache lại để lần sau không cần generate lại
      await redis.set(seatmapKey, JSON.stringify(seats));
      console.log(`[seat-repo] Generated default seat map for trip ${tripId}: ${seats.length} seats`);
    }

    // Dùng pipeline để kiểm tra trạng thái tất cả ghế trong 1 round-trip
    const pipeline = redis.pipeline();
    for (const seat of seats) {
      pipeline.exists(keys.hold(tripId, seat.seatId));
      pipeline.exists(keys.booked(tripId, seat.seatId));
      pipeline.exists(keys.blocked(tripId, seat.seatId));
    }
    const results = await pipeline.exec();

    // Ghép trạng thái vào từng ghế
    return seats.map((seat, idx) => {
      const [, isHeld]    = results[idx * 3];
      const [, isBooked]  = results[idx * 3 + 1];
      const [, isBlocked] = results[idx * 3 + 2];

      let status = 'AVAILABLE';
      if (isBooked)  status = 'BOOKED';
      else if (isBlocked) status = 'BLOCKED';
      else if (isHeld)    status = 'HELD';

      return { ...seat, status };
    });
  },

  /**
   * Lưu sơ đồ ghế tùy chỉnh vào Redis (dùng khi Admin tạo chuyến mới)
   */
  async setSeatMap(tripId, seats) {
    const seatmapKey = keys.seatmap(tripId);
    await redis.set(seatmapKey, JSON.stringify(seats));
    console.log(`[seat-repo] Saved seat map for trip ${tripId}: ${seats.length} seats`);
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Sinh sơ đồ ghế mặc định 34 chỗ (giường nằm) cho demo
// Trong production, dữ liệu này sẽ đến từ Admin Service khi tạo chuyến
// ═════════════════════════════════════════════════════════════════════════════
function generateDefaultSeatMap(tripId) {
  const seats = [];

  // Tầng dưới: A01-A17 (hàng A = cửa sổ trái, hàng B = cửa sổ phải)
  for (let i = 1; i <= 17; i++) {
    const num = String(i).padStart(2, '0');
    seats.push({ seatId: `${tripId}_A${num}`, seatNumber: `A${num}`, floor: 1, type: 'sleeper' });
    seats.push({ seatId: `${tripId}_B${num}`, seatNumber: `B${num}`, floor: 1, type: 'sleeper' });
  }

  return seats;
}

module.exports = seatRepository;
