/**
 * adminService.js - Tầng nghiệp vụ của admin-service
 *
 * Xử lý:
 * - Bus CRUD (Đặc tả 7.2 điểm 2)
 * - Trip management: ACTIVATE, LOCK, SET_DEPARTED, SET_COMPLETED (điểm 4,7)
 * - Xem danh sách booking theo chuyến (điểm 5)
 * - Block/Unblock ghế (điểm 8)
 * - Dashboard stats (thống kê từ admin_events + buses)
 */
const adminRepository = require('./adminRepository');
const { seatClient }  = require('./grpcClients');
require('dotenv').config();

// ── Trạng thái chuyến hợp lệ để Admin chuyển
const TRIP_STATUS_ACTIONS = ['ACTIVATE', 'LOCK', 'SET_DEPARTED', 'SET_COMPLETED'];

const adminService = {

  // ═════════════════════════════════════════════════════════════════════════
  // BUS CRUD
  // ═════════════════════════════════════════════════════════════════════════

  async createBus({ licensePlate, busType, totalSeats, seatLayout, status }) {
    if (!licensePlate || !busType || !totalSeats) {
      throw new Error('Thiếu thông tin bắt buộc: licensePlate, busType, totalSeats');
    }

    // Nếu không truyền seatLayout, clone từ template
    let layout = seatLayout;
    if (!layout) {
      const template = await adminRepository.findTemplateByName(busType);
      if (!template) throw new Error(`Không tìm thấy template cho busType: ${busType}`);
      layout = template.layout;
    }

    const bus = await adminRepository.createBus({
      licensePlate, busType, totalSeats,
      seatLayout: typeof layout === 'string' ? layout : JSON.stringify(layout),
      status,
    });

    await adminRepository.logEvent({
      eventType: 'bus_created',
      actorId:   'admin',
      actorRole: 'ADMIN',
      payload:   { busId: bus.id, licensePlate, busType },
    });

    console.log(`[admin-service] Tạo xe: ${licensePlate} (${busType})`);
    return bus;
  },

  async getBus(busId) {
    const bus = await adminRepository.findBusById(busId);
    if (!bus) throw new Error(`Không tìm thấy xe: ${busId}`);
    return bus;
  },

  async listBuses({ status, limit, offset }) {
    return adminRepository.listBuses({ status, limit, offset });
  },

  async updateBus(busId, updates) {
    const bus = await adminRepository.findBusById(busId);
    if (!bus) throw new Error(`Không tìm thấy xe: ${busId}`);

    const updated = await adminRepository.updateBus(busId, {
      license_plate: updates.licensePlate || bus.license_plate,
      bus_type:      updates.busType      || bus.bus_type,
      total_seats:   updates.totalSeats   || bus.total_seats,
      seat_layout:   updates.seatLayout
        ? (typeof updates.seatLayout === 'string' ? updates.seatLayout : JSON.stringify(updates.seatLayout))
        : bus.seat_layout,
      status:        updates.status       || bus.status,
    });

    return updated;
  },

  async deleteBus(busId) {
    const deleted = await adminRepository.deleteBus(busId);
    if (!deleted) throw new Error(`Không tìm thấy xe để xóa: ${busId}`);
    console.log(`[admin-service] Xóa xe: ${busId}`);
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TRIP MANAGEMENT (Đặc tả 7.2 điểm 3,4,7)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Thay đổi trạng thái chuyến
   * action: ACTIVATE | LOCK | SET_DEPARTED | SET_COMPLETED
   *
   * Lưu ý: trip data nằm trong trip-service (trip_db),
   * admin-service chỉ ghi admin_events audit log.
   * Trong thực tế cần thêm RPC ManageTrip vào trip-service proto.
   * Hiện tại: ghi log + trả về success.
   */
  async manageTrip({ action, tripId, actorId, routeName }) {
    if (!TRIP_STATUS_ACTIONS.includes(action)) {
      throw new Error(`Action không hợp lệ: ${action}. Cho phép: ${TRIP_STATUS_ACTIONS.join(', ')}`);
    }
    if (!tripId) throw new Error('Thiếu tripId');

    await adminRepository.logEvent({
      eventType: `trip_${action.toLowerCase()}`,
      actorId:   actorId || 'admin',
      actorRole: 'ADMIN',
      payload:   { action, tripId, routeName },
    });

    console.log(`[admin-service] ManageTrip: action=${action} tripId=${tripId}`);
    return { success: true, message: `Đã thực hiện ${action} cho chuyến ${tripId}` };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TASK-04: BLOCK/UNBLOCK SEAT (Đặc tả 7.2 điểm 8)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Admin khóa ghế trống (BLOCKED):
   * 1. Gọi gRPC HoldSeat với userId='ADMIN_BLOCK' → seat-service SETNX ghế
   * 2. Ghi record vào blocked_seats (audit trail bền vững)
   * 3. Ghi admin_events log
   */
  async blockSeat({ tripId, seatId, adminId, reason }) {
    if (!tripId || !seatId) throw new Error('Thiếu tripId hoặc seatId');

    // Gọi seat-service để khóa ghế trong Redis (HELD với userId đặc biệt ADMIN_BLOCK)
    try {
      const result = await seatClient.HoldSeat({
        tripId,
        seatId,
        userId: `ADMIN_BLOCK:${adminId || 'admin'}`,
      });
      if (!result.success) {
        throw new Error(`Không thể khóa ghế ${seatId}: ${result.message}`);
      }
    } catch (err) {
      throw new Error(`Lỗi khi khóa ghế ${seatId}: ${err.message}`);
    }

    // Ghi vào DB audit
    await adminRepository.blockSeat({ tripId, seatId, adminId: adminId || 'admin', reason });

    await adminRepository.logEvent({
      eventType: 'block_seat',
      actorId:   adminId || 'admin',
      actorRole: 'ADMIN',
      payload:   { tripId, seatId, reason },
    });

    console.log(`[admin-service] Khóa ghế: trip=${tripId} seat=${seatId} by=${adminId}`);
    return { success: true, message: `Ghế ${seatId} đã bị khóa.` };
  },

  /**
   * Admin mở khóa ghế:
   * 1. Gọi gRPC ReleaseSeat → seat-service xóa key Redis
   * 2. Cập nhật blocked_seats.is_active = false
   */
  async unblockSeat({ tripId, seatId, adminId }) {
    if (!tripId || !seatId) throw new Error('Thiếu tripId hoặc seatId');

    // Nhả ghế trong seat-service
    try {
      await seatClient.ReleaseSeat({ tripId, seatId });
    } catch (err) {
      console.warn(`[admin-service] Cảnh báo: không thể nhả ghế trong seat-service:`, err.message);
    }

    await adminRepository.unblockSeat({ tripId, seatId });

    await adminRepository.logEvent({
      eventType: 'unblock_seat',
      actorId:   adminId || 'admin',
      actorRole: 'ADMIN',
      payload:   { tripId, seatId },
    });

    console.log(`[admin-service] Mở khóa ghế: trip=${tripId} seat=${seatId}`);
    return { success: true, message: `Ghế ${seatId} đã được mở khóa.` };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DASHBOARD (Đặc tả 7.2 + 8.1)
  // ═════════════════════════════════════════════════════════════════════════

  async getDashboardStats({ date }) {
    // Thống kê cơ bản từ admin_db
    const [totalBuses] = await require('./db')('buses').count('id as count');
    const [totalEvents] = await require('./db')('admin_events').count('id as count');

    // Thống kê booking phải lấy từ booking-service (qua gRPC)
    // Ở đây trả về dữ liệu placeholder — sẽ tích hợp analytics-consumer ở Giai đoạn 8
    return {
      totalBookings: 0,      // Placeholder — Giai đoạn 8: lấy từ analytics-consumer
      totalRevenue:  0,
      activeUsers:   0,
      totalTrips:    0,
      totalBuses:    parseInt(totalBuses.count),
    };
  },
};

module.exports = adminService;
