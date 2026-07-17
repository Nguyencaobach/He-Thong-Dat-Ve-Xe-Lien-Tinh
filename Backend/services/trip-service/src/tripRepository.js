/**
 * tripRepository.js - Tầng truy vấn DB cho bảng trips
 */
const db = require('./db');

const tripRepository = {
  /**
   * Tìm chuyến xe theo mảng routeId và ngày đi
   */
  async findByRouteIdsAndDate(routeIds, date) {
    if (!routeIds || routeIds.length === 0) return [];
    
    return db('trips')
      .join('routes', 'trips.route_id', 'routes.id')
      .select(
        'trips.*',
        'routes.name as route_name',
        'routes.departure_province',
        'routes.arrival_province',
        'routes.departure_station',
        'routes.arrival_station',
      )
      .whereIn('trips.route_id', routeIds)
      .whereRaw(`DATE(trips.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh') = ?`, [date])
      .whereRaw(`trips.departure_time > NOW()`)
      .where('trips.status', 'SCHEDULED')
      .where('trips.available_seats', '>', 0)
      .orderBy('trips.departure_time', 'asc');
  },

  /**
   * Tìm chuyến xe theo route_id và ngày đi
   * date: string dạng 'YYYY-MM-DD'
   */
  async findByRouteAndDate(routeId, date) {
    // Lọc theo ngày (bỏ qua giờ/phút) và chỉ lấy chuyến còn chỗ trống
    return db('trips')
      .join('routes', 'trips.route_id', 'routes.id')
      .select(
        'trips.*',
        'routes.name as route_name',
        'routes.departure_province',
        'routes.arrival_province',
        'routes.departure_station',
        'routes.arrival_station',
      )
      .where('trips.route_id', routeId)
      .whereRaw(`DATE(trips.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh') = ?`, [date])
      .whereRaw(`trips.departure_time > NOW()`)
      .where('trips.status', 'SCHEDULED')
      .where('trips.available_seats', '>', 0)
      .orderBy('trips.departure_time', 'asc');
  },

  /**
   * Lấy chi tiết 1 chuyến theo id
   */
  async findById(id) {
    return db('trips')
      .join('routes', 'trips.route_id', 'routes.id')
      .select(
        'trips.*',
        'routes.name as route_name',
        'routes.departure_province',
        'routes.arrival_province',
        'routes.departure_station',
        'routes.arrival_station',
        'routes.distance_km',
      )
      .where('trips.id', id)
      .first();
  },

  /**
   * Cập nhật số ghế còn lại (gọi từ seat-service qua event)
   */
  async updateAvailableSeats(tripId, availableSeats) {
    return db('trips')
      .where({ id: tripId })
      .update({ available_seats: availableSeats, updated_at: db.fn.now() });
  },

  /**
   * Lấy danh sách tuyến đường phổ biến (demo)
   * Lấy ngẫu nhiên các chuyến sắp chạy, còn chỗ trống
   */
  async findPopularTrips(limit = 3) {
    return db('trips')
      .join('routes', 'trips.route_id', 'routes.id')
      .select(
        'trips.*',
        'routes.name as route_name',
        'routes.departure_province',
        'routes.arrival_province',
        'routes.departure_station',
        'routes.arrival_station',
        'routes.distance_km'
      )
      .whereRaw(`trips.departure_time > NOW()`)
      .where('trips.status', 'SCHEDULED')
      .where('trips.available_seats', '>', 0)
      .orderByRaw('RANDOM()')
      .limit(limit);
  },

  /**
   * ADMIN: Tạo tuyến xe mới
   */
  async createRoute(routeData) {
    const { departure_province, arrival_province, departure_station, arrival_station, distance_km, duration_minutes } = routeData;
    const name = `${departure_province} - ${arrival_province}`;
    
    const [newRoute] = await db('routes')
      .insert({
        name,
        departure_province,
        arrival_province,
        departure_station,
        arrival_station,
        distance_km,
        duration_minutes,
        is_active: true
      })
      .returning('*');
      
    return newRoute;
  },

  /**
   * ADMIN: Lấy danh sách tuyến xe có phân trang
   */
  async listRoutes(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const [{ count }] = await db('routes').count('* as count');
    const routes = await db('routes')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
      
    return { routes, total: parseInt(count, 10) };
  },

  // ─── ADMIN TRIP MANAGEMENT ─────────────────────────────────────────────

  async createTrip(tripData) {
    const [id] = await db('trips').insert(tripData).returning('id');
    return id.id;
  },

  async updateTrip(id, tripData) {
    await db('trips').where({ id }).update({ ...tripData, updated_at: db.fn.now() });
    return true;
  },
  async deleteTrip(id) {
    await db('trips').where({ id }).del();
    return true;
  },

  async listAdminTrips({ limit, offset, date }) {
    const query = db('trips')
      .join('routes', 'trips.route_id', 'routes.id')
      .select(
        'trips.*',
        'routes.name as route_name',
        'routes.departure_station',
        'routes.arrival_station'
      )
      .orderBy('trips.created_at', 'desc');

    if (date) {
      query.whereRaw(`DATE(trips.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh') = ?`, [date]);
    }

    const [{ count }] = await query.clone().clearSelect().clearOrder().count('trips.id as count');
    
    if (limit) {
      query.limit(limit).offset(offset || 0);
    }
    
    const trips = await query;
    return { trips, total: parseInt(count) };
  }
};

module.exports = tripRepository;
