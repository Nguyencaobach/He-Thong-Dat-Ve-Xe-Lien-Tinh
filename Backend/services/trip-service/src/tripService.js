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

const { getExpandedLocations } = require('./locations');

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

    // Mở rộng tìm kiếm: VD "Tỉnh Lâm Đồng" -> ["Tỉnh Lâm Đồng", "Thành phố Đà Lạt"]
    const departures = getExpandedLocations(departure);
    const destinations = getExpandedLocations(destination);

    // ── Bước 2: Tìm tất cả tuyến xe phù hợp ─────────────────────────────────
    const routes = await routeRepository.findRoutes(departures, destinations);
    if (!routes || routes.length === 0) {
      return []; // Không có tuyến nào → trả rỗng
    }

    // Lấy mảng ID của các tuyến xe
    const routeIds = routes.map(r => r.id);

    // ── Bước 3: Tìm chuyến trong ngày cho tất cả tuyến xe ───────────────────
    const trips = await tripRepository.findByRouteIdsAndDate(routeIds, date);

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

  /**
   * Lấy danh sách tuyến đường phổ biến (cho trang chủ)
   */
  async getPopularTrips() {
    const trips = await tripRepository.findPopularTrips(3);
    return trips.map(mapToTripResponse);
  },

  /**
   * Tạo tuyến xe mới (ADMIN)
   */
  async createRoute(routeData) {
    const db = require('./db');
    const existing = await db('routes')
      .where({ departure_province: routeData.departure_province, arrival_province: routeData.arrival_province })
      .first();
    if (existing) {
      throw new Error(`Tuyến xe từ ${routeData.departure_province} đến ${routeData.arrival_province} đã tồn tại.`);
    }
    const route = await tripRepository.createRoute(routeData);
    return mapToRouteResponse(route);
  },

  /**
   * Lấy danh sách tuyến xe (ADMIN)
   */
  async listRoutes(page = 1, limit = 10) {
    const db = require('./db');
    const validPage = Math.max(1, page || 1);
    const validLimit = Math.max(1, limit || 10);
    const offset = (validPage - 1) * validLimit;

    const [countResult, routes] = await Promise.all([
      db('routes').count('* as total').first(),
      db('routes').orderBy('created_at', 'desc').limit(validLimit).offset(offset),
    ]);

    const total = parseInt(countResult.total, 10);
    const routeResponses = routes.map((r) => ({
      id: r.id,
      name: r.name,
      departureProvince: r.departure_province,
      arrivalProvince: r.arrival_province,
      departureStation: r.departure_station,
      arrivalStation: r.arrival_station,
      distanceKm: r.distance_km,
      durationMinutes: r.duration_minutes,
      isActive: r.is_active,
    }));

    return { total, routes: routeResponses };
  },

  /**
   * Cập nhật tuyến xe
   */
  async updateRoute(id, data) {
    const db = require('./db');
    
    if (data.departure_province && data.arrival_province) {
      const existing = await db('routes')
        .where({ departure_province: data.departure_province, arrival_province: data.arrival_province })
        .whereNot('id', id)
        .first();
      if (existing) {
        throw new Error(`Tuyến xe từ ${data.departure_province} đến ${data.arrival_province} đã tồn tại.`);
      }
      data.name = `${data.departure_province} - ${data.arrival_province}`;
    }

    await db('routes')
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now()
      });

    const route = await db('routes').where({ id }).first();
    return mapToRouteResponse(route);
  },

  /**
   * Xóa tuyến xe
   */
  async deleteRoute(id) {
    const db = require('./db');
    const deletedCount = await db('routes').where({ id }).del();
    return deletedCount > 0;
  },

  // ─── ADMIN TRIP MANAGEMENT ─────────────────────────────────────────────

  async createTrip(data) {
    // We just assume total_seats is provided or fetched via gateway.
    // For now, we will default available_seats to total_seats (or 0 if total_seats is not provided)
    const tripData = {
      route_id: data.routeId,
      bus_id: data.busId,
      bus_type: data.busType || 'LIMOUSINE',
      departure_time: new Date(data.departureTime),
      arrival_time: new Date(data.arrivalTime),
      base_price: data.price,
      total_seats: data.totalSeats || 0, // This needs to be provided by the caller or assumed 0 until updated
      available_seats: data.totalSeats || 0,
      pick_up_point: data.pickUpPoint,
      drop_off_point: data.dropOffPoint,
      distance: data.distance,
      status: data.status || 'SCHEDULED'
    };

    if (tripData.departure_time < new Date()) {
      throw new Error("Không thể chọn thời gian khởi hành trong quá khứ.");
    }

    const newTripId = await tripRepository.createTrip(tripData);
    const newTrip = await tripRepository.findById(newTripId);
    
    // Clear search cache so new trips appear immediately
    await tripCache.clearAllSearchCache();
    
    return mapToTripResponse(newTrip);
  },

  async updateTrip(id, data) {
    const tripData = {
      route_id: data.routeId,
      bus_id: data.busId,
      bus_type: data.busType,
      departure_time: new Date(data.departureTime),
      arrival_time: new Date(data.arrivalTime),
      base_price: data.price,
      pick_up_point: data.pickUpPoint,
      drop_off_point: data.dropOffPoint,
      distance: data.distance,
      status: data.status,
      total_seats: data.totalSeats || 0,
      available_seats: data.totalSeats || 0
    };

    if (tripData.departure_time < new Date()) {
      throw new Error("Không thể chọn thời gian khởi hành trong quá khứ.");
    }

    await tripRepository.updateTrip(id, tripData);
    const updatedTrip = await tripRepository.findById(id);
    
    // Clear search cache so updated trips appear immediately
    await tripCache.clearAllSearchCache();
    
    return mapToTripResponse(updatedTrip);
  },

  async deleteTrip(id) {
    const success = await tripRepository.deleteTrip(id);
    
    // Clear search cache so deleted trips disappear immediately
    await tripCache.clearAllSearchCache();
    
    return success;
  },

  async listAdminTrips(page = 1, limit = 10, date = '') {
    const validPage = Math.max(1, page || 1);
    const validLimit = Math.max(1, limit || 10);
    const offset = (validPage - 1) * validLimit;
    const { trips, total } = await tripRepository.listAdminTrips({ limit: validLimit, offset, date });
    return { trips: trips.map(mapToTripResponse), total };
  }
};

function mapToRouteResponse(route) {
  return {
    id: route.id,
    name: route.name,
    departureProvince: route.departure_province,
    arrivalProvince: route.arrival_province,
    departureStation: route.departure_station,
    arrivalStation: route.arrival_station,
    distanceKm: route.distance_km,
    durationMinutes: route.duration_minutes,
    isActive: route.is_active,
  };
}

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
    price: Number(trip.base_price),
    availableSeats: Number(trip.available_seats),
    departureStation: trip.departure_station,
    arrivalStation: trip.arrival_station,
    busType: trip.bus_type,
    pickUpPoint: trip.pick_up_point || "",
    dropOffPoint: trip.drop_off_point || "",
    distance: trip.distance || 0,
    status: trip.status || "SCHEDULED",
    routeId: trip.route_id,
    busId: trip.bus_id || ""
  };
}

module.exports = tripService;
