/**
 * routeRepository.js - Tầng truy vấn DB cho bảng routes
 */
const db = require('./db');

const routeRepository = {
  /**
   * Tìm kiếm tỉnh/thành phố theo prefix (Autocomplete)
   * Ví dụ: nhập "đà" → trả về ["Đà Lạt", "Đà Nẵng"]
   */
  async searchProvinces(keyword) {
    const pattern = `%${keyword}%`;
    const rows = await db('routes')
      .select(db.raw('DISTINCT departure_province AS province'))
      .where('departure_province', 'ilike', pattern)
      .where('is_active', true)
      .union(function () {
        this.select(db.raw('DISTINCT arrival_province AS province'))
          .from('routes')
          .where('arrival_province', 'ilike', pattern)
          .where('is_active', true);
      })
      .orderBy('province');
    return rows.map((r) => r.province);
  },

  /**
   * Tìm nhiều tuyến xe theo mảng điểm đi - điểm đến
   */
  async findRoutes(departures, arrivals) {
    return db('routes')
      .whereIn('departure_province', departures)
      .whereIn('arrival_province', arrivals)
      .where('is_active', true);
  },

  /**
   * Tìm tuyến xe theo cặp điểm đi - điểm đến (cũ)
   */
  async findRoute(departureProvince, arrivalProvince) {
    return db('routes')
      .where('departure_province', 'ilike', departureProvince)
      .where('arrival_province', 'ilike', arrivalProvince)
      .where('is_active', true)
      .first();
  },

  async findById(id) {
    return db('routes').where({ id }).first();
  },

  async findAll() {
    return db('routes').where('is_active', true).orderBy('name');
  },
};

module.exports = routeRepository;
