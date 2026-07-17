/**
 * adminGrpcHandlers.js - Xử lý tất cả gRPC request từ API Gateway
 *
 * Map các RPC từ admin.proto sang service/logic tương ứng
 */
const grpc      = require('@grpc/grpc-js');
const adminService    = require('./adminService');
const checkinService  = require('./checkinService');

function createAdminGrpcHandlers() {
  return {

    // ── Dashboard ───────────────────────────────────────────────────────────
    async GetDashboardStats(call, callback) {
      try {
        const stats = await adminService.getDashboardStats(call.request);
        callback(null, stats);
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },

    // ── Bus CRUD ─────────────────────────────────────────────────────────────
    async CreateBus(call, callback) {
      try {
        const { name, licensePlate, busType, totalSeats, seatLayout, status } = call.request;
        if (!licensePlate || !busType || !totalSeats) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu licensePlate, busType hoặc totalSeats' });
        }
        const bus = await adminService.createBus({ name, licensePlate, busType, totalSeats: parseInt(totalSeats), seatLayout, status });
        callback(null, _mapBus(bus));
      } catch (err) {
        console.error('[admin] CreateBus error:', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },

    async GetBus(call, callback) {
      try {
        const bus = await adminService.getBus(call.request.busId);
        callback(null, _mapBus(bus));
      } catch (err) {
        const code = err.message.includes('Không tìm thấy') ? grpc.status.NOT_FOUND : grpc.status.INTERNAL;
        callback({ code, message: err.message });
      }
    },

    async ListBuses(call, callback) {
      try {
        const { status, limit, offset } = call.request;
        const { buses, total } = await adminService.listBuses({
          status: status || null,
          limit:  parseInt(limit)  || 20,
          offset: parseInt(offset) || 0,
        });
        callback(null, { buses: buses.map(_mapBus), total });
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },

    async UpdateBus(call, callback) {
      try {
        const { busId, ...updates } = call.request;
        if (!busId) return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu busId' });
        const bus = await adminService.updateBus(busId, updates);
        callback(null, _mapBus(bus));
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },

    async DeleteBus(call, callback) {
      try {
        await adminService.deleteBus(call.request.busId);
        callback(null, { success: true, message: 'Xóa xe thành công.' });
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },

    // ── Trip Management ──────────────────────────────────────────────────────
    async ManageTrip(call, callback) {
      try {
        const { action, tripId, routeName } = call.request;
        const result = await adminService.manageTrip({ action, tripId, routeName });
        callback(null, result);
      } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },

    async ListBookingsByTrip(call, callback) {
      // Proxy sang booking-service (xem danh sách booking theo chuyến)
      // Hiện tại: booking.proto chưa có RPC này → trả empty list + ghi log
      console.warn('[admin] ListBookingsByTrip: cần bổ sung RPC vào booking.proto');
      callback(null, { bookings: [], total: 0 });
    },

    // ── Block/Unblock Seat ────────────────────────────────────────────────────
    async BlockSeat(call, callback) {
      try {
        const { tripId, seatId, adminId, reason } = call.request;
        const result = await adminService.blockSeat({ tripId, seatId, adminId, reason });
        callback(null, result);
      } catch (err) {
        console.error('[admin] BlockSeat error:', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },

    async UnblockSeat(call, callback) {
      try {
        const { tripId, seatId, adminId } = call.request;
        const result = await adminService.unblockSeat({ tripId, seatId, adminId });
        callback(null, result);
      } catch (err) {
        console.error('[admin] UnblockSeat error:', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },

    // ── Check-in ─────────────────────────────────────────────────────────────
    async CheckIn(call, callback) {
      try {
        const { qrCode, tripId, staffId } = call.request;
        if (!qrCode || !tripId) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu qrCode hoặc tripId' });
        }
        console.log(`[admin] CheckIn: qr=${qrCode} trip=${tripId} staff=${staffId}`);
        const result = await checkinService.checkIn({ qrCode, tripId, staffId });
        callback(null, result);
      } catch (err) {
        console.error('[admin] CheckIn error:', err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
      }
    },
  };
}

// ── Helper: map DB row → proto BusResponse ────────────────────────────────────
function _mapBus(bus) {
  if (!bus) return null;
  return {
    busId:        bus.id,
    name:         bus.name || '',
    licensePlate: bus.license_plate,
    busType:      bus.bus_type,
    totalSeats:   bus.total_seats,
    seatLayout:   typeof bus.seat_layout === 'string'
      ? bus.seat_layout
      : JSON.stringify(bus.seat_layout),
    status:       bus.status,
    createdAt:    bus.created_at ? bus.created_at.toISOString() : '',
  };
}

module.exports = { createAdminGrpcHandlers };
