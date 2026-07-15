/**
 * tripRepository.js - Tầng truy vấn DB cho bảng trips
 */
const db = require('./db');

const tripRepository = {
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
};

module.exports = tripRepository;
