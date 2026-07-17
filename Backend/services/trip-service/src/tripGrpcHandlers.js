/**
 * tripGrpcHandlers.js - Xử lý các gRPC request từ API Gateway
 *
 * Handlers nhận call từ gRPC, gọi tripService/routeService,
 * sau đó trả kết quả về dưới dạng callback (chuẩn gRPC).
 */
const grpc = require('@grpc/grpc-js');
const tripService = require('./tripService');
const routeService = require('./routeService');

function createTripGrpcHandlers() {
  return {
    /**
     * SearchTrips: Tìm chuyến theo điểm đi, điểm đến, ngày
     * Request: { departure: string, destination: string, date: string }
     * Response: { trips: TripResponse[] }
     */
    async SearchTrips(call, callback) {
      try {
        const { departure, destination, date } = call.request;

        if (!departure || !destination || !date) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu thông tin: cần departure, destination, và date (YYYY-MM-DD)',
          });
        }

        console.log(`[trip-service] SearchTrips: ${departure} → ${destination} [${date}]`);
        const trips = await tripService.searchTrips(departure, destination, date);
        callback(null, { trips });
      } catch (error) {
        console.error('[trip-service] SearchTrips error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * GetTripDetails: Lấy chi tiết 1 chuyến xe
     * Request: { tripId: string }
     * Response: TripResponse
     */
    async GetTripDetails(call, callback) {
      try {
        const { tripId } = call.request;

        if (!tripId) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu tripId',
          });
        }

        console.log(`[trip-service] GetTripDetails: tripId=${tripId}`);
        const trip = await tripService.getTripDetails(tripId);
        callback(null, trip);
      } catch (error) {
        if (error.code === 'NOT_FOUND') {
          return callback({ code: grpc.status.NOT_FOUND, message: error.message });
        }
        console.error('[trip-service] GetTripDetails error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * GetPopularTrips: Lấy danh sách tuyến đường phổ biến
     * Request: {}
     * Response: { trips: TripResponse[] }
     */
    async GetPopularTrips(call, callback) {
      try {
        console.log(`[trip-service] GetPopularTrips`);
        const trips = await tripService.getPopularTrips();
        callback(null, { trips });
      } catch (error) {
        console.error('[trip-service] GetPopularTrips error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * Autocomplete: Gợi ý tỉnh/thành khi gõ tìm kiếm
     * Request: { keyword: string }
     * Response: { provinces: string[] }
     */
    async Autocomplete(call, callback) {
      try {
        const { keyword } = call.request;
        const provinces = await routeService.autocomplete(keyword || '');
        callback(null, { provinces });
      } catch (error) {
        console.error('[trip-service] Autocomplete error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * CreateRoute: Tạo tuyến xe mới (ADMIN)
     */
    async CreateRoute(call, callback) {
      try {
        const { departureProvince, arrivalProvince, departureStation, arrivalStation, distanceKm, durationMinutes } = call.request;
        
        if (!departureProvince || !arrivalProvince || !departureStation || !arrivalStation || distanceKm === undefined || durationMinutes === undefined) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu thông tin tuyến xe (cần tỉnh/bến đi, tỉnh/bến đến, khoảng cách, thời gian).',
          });
        }

        console.log(`[trip-service] CreateRoute: ${departureProvince} → ${arrivalProvince}`);
        const routeData = {
          departure_province: departureProvince,
          arrival_province: arrivalProvince,
          departure_station: departureStation,
          arrival_station: arrivalStation,
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
        };
        const route = await tripService.createRoute(routeData);
        callback(null, route);
      } catch (error) {
        console.error('[trip-service] CreateRoute error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * ListRoutes: Lấy danh sách tuyến xe (ADMIN)
     */
    async ListRoutes(call, callback) {
      try {
        const { page = 1, limit = 10 } = call.request;
        const result = await tripService.listRoutes(page, limit);
        callback(null, result);
      } catch (error) {
        console.error('[trip-service] ListRoutes error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * UpdateRoute: Cập nhật tuyến xe
     */
    async UpdateRoute(call, callback) {
      try {
        const { id, departureProvince, arrivalProvince, isActive } = call.request;
        if (!id) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu route ID.',
          });
        }
        
        console.log(`[trip-service] UpdateRoute: ${id}`);
        const updated = await tripService.updateRoute(id, {
          departure_province: departureProvince,
          arrival_province: arrivalProvince,
          is_active: isActive
        });
        callback(null, updated);
      } catch (error) {
        console.error('[trip-service] UpdateRoute error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    /**
     * DeleteRoute: Xóa tuyến xe
     */
    async DeleteRoute(call, callback) {
      try {
        const { id } = call.request;
        if (!id) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'Thiếu route ID.',
          });
        }
        
        console.log(`[trip-service] DeleteRoute: ${id}`);
        const deleted = await tripService.deleteRoute(id);
        callback(null, { success: deleted, message: deleted ? 'Xóa tuyến thành công' : 'Không tìm thấy tuyến xe' });
      } catch (error) {
        console.error('[trip-service] DeleteRoute error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    // ─── ADMIN TRIP MANAGEMENT ─────────────────────────────────────────────

    async CreateTrip(call, callback) {
      try {
        const data = call.request;
        if (!data.routeId || !data.departureTime || !data.arrivalTime || !data.price) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu thông tin tuyến xe, thời gian, hoặc giá vé' });
        }
        console.log(`[trip-service] CreateTrip for route ${data.routeId}`);
        const trip = await tripService.createTrip(data);
        callback(null, trip);
      } catch (error) {
        console.error('[trip-service] CreateTrip error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    async UpdateTrip(call, callback) {
      try {
        const data = call.request;
        if (!data.id) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu trip ID' });
        }
        console.log(`[trip-service] UpdateTrip ${data.id}`);
        const trip = await tripService.updateTrip(data.id, data);
        callback(null, trip);
      } catch (error) {
        console.error('[trip-service] UpdateTrip error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    async DeleteTrip(call, callback) {
      try {
        const { id } = call.request;
        if (!id) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Thiếu trip ID' });
        }
        console.log(`[trip-service] DeleteTrip ${id}`);
        const success = await tripService.deleteTrip(id);
        callback(null, { success, message: success ? 'Xóa chuyến xe thành công' : 'Không tìm thấy chuyến xe' });
      } catch (error) {
        console.error('[trip-service] DeleteTrip error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },

    async ListAdminTrips(call, callback) {
      try {
        const { page = 1, limit = 10, date } = call.request;
        const result = await tripService.listAdminTrips(page, limit, date);
        callback(null, result);
      } catch (error) {
        console.error('[trip-service] ListAdminTrips error:', error.message);
        callback({ code: grpc.status.INTERNAL, message: error.message });
      }
    },
  };
}

module.exports = { createTripGrpcHandlers };
