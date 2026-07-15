/**
 * tripService.js - Logic nghiệp vụ Tìm kiếm chuyến xe
 *
 * Task-06 + Task-07 + Task-08:
 * 1. Kiểm tra Redis cache trước
 * 2. Nếu cache miss → query DB
 * 3. Lưu kết quả vào cache
 * 4. Lưu log tìm kiếm vào outbox_events (async → Kafka)
 */
const routeRepository = require('./routeRepository');
const tripRepository = require('./tripRepository');
const tripCache = require('./tripCache');
const outboxEventRepository = require('./outboxEventRepository');

const tripService = {
  /**
   * Tìm chuyến xe theo điểm đi, điểm đến, ngày
   * @param {string} departure - Tỉnh/thành phố đi ("TP.HCM")
   * @param {string} destination - Tỉnh/thành phố đến ("Đà Lạt")
   * @param {string} date - Ngày đi "YYYY-MM-DD"
   * @returns {Array} Danh sách TripResponse
   */
  async searchTrips(departure, destination, date) {
    // ── Bước 1: Kiểm tra Redis Cache ────────────────────────────────────────
    const cached = await tripCache.getSearchResult(departure, destination, date);
    if (cached) {
      return cached;
    }

    // ── Bước 2: Tìm tuyến xe phù hợp ────────────────────────────────────────
    const route = await routeRepository.findRoute(departure, destination);
    if (!route) {
      return []; // Không có tuyến nào → trả rỗng
    }

    // ── Bước 3: Tìm chuyến trong ngày ────────────────────────────────────────
    const trips = await tripRepository.findByRouteAndDate(route.id, date);

    // ── Bước 4: Map sang format TripResponse (theo trip.proto) ───────────────
    const result = trips.map(mapToTripResponse);

    // ── Bước 5: Lưu cache ────────────────────────────────────────────────────
    await tripCache.setSearchResult(departure, destination, date, result);

    // ── Bước 6: Lưu outbox event (Task-08 — không blocking) ─────────────────
    // Không await → không làm chậm response, lỗi không ảnh hưởng kết quả
    outboxEventRepository.saveSearchEvent({ departure, destination, date, resultCount: result.length })
      .catch((err) => console.warn('[trip-service] Lỗi lưu outbox event:', err.message));

    return result;
  },

  /**
   * Lấy chi tiết một chuyến xe
   */
  async getTripDetails(tripId) {
    const trip = await tripRepository.findById(tripId);
    if (!trip) {
      const error = new Error(`Không tìm thấy chuyến xe với id: ${tripId}`);
      error.code = 'NOT_FOUND';
      throw error;
    }
    return mapToTripResponse(trip);
  },
};

/**
 * Map dữ liệu DB sang TripResponse theo định nghĩa trong trip.proto
 */
function mapToTripResponse(trip) {
  return {
    tripId: trip.id,
    routeName: trip.route_name || trip.name,
    departureTime: trip.departure_time instanceof Date
      ? trip.departure_time.toISOString()
      : String(trip.departure_time),
    arrivalTime: trip.arrival_time instanceof Date
      ? trip.arrival_time.toISOString()
      : String(trip.arrival_time),
    price: parseFloat(trip.base_price),
    availableSeats: parseInt(trip.available_seats),
    // Thông tin bổ sung (ngoài proto, dùng cho Frontend)
    departureStation: trip.departure_station,
    arrivalStation: trip.arrival_station,
    busType: trip.bus_type,
  };
}

module.exports = tripService;
