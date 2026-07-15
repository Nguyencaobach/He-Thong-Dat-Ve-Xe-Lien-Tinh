/**
 * routeService.js - Logic nghiệp vụ Autocomplete tuyến xe
 *
 * Task-05: Gợi ý điểm đi/điểm đến khi khách gõ vào ô tìm kiếm.
 * Ví dụ: gõ "đà" → ["Đà Lạt", "Đà Nẵng"]
 */
const routeRepository = require('./routeRepository');

const routeService = {
  /**
   * Autocomplete tỉnh/thành phố
   * Dùng cho cả ô "Điểm đi" và "Điểm đến"
   */
  async autocomplete(keyword) {
    if (!keyword || keyword.trim().length < 1) {
      return [];
    }
    const provinces = await routeRepository.searchProvinces(keyword.trim());
    return provinces;
  },

  /**
   * Lấy danh sách tất cả tuyến đang hoạt động
   */
  async getAllRoutes() {
    return routeRepository.findAll();
  },
};

module.exports = routeService;
