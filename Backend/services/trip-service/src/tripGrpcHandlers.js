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
  };
}

module.exports = { createTripGrpcHandlers };
