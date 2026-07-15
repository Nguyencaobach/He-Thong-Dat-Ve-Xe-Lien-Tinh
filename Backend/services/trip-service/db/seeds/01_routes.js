/**
 * Seed: 01_routes.js
 * Chèn 6 tuyến xe mẫu theo đặc tả hệ thống:
 * - Các tỉnh/thành: TP.HCM, Đà Lạt, Nha Trang, Cần Thơ, Đà Nẵng, Hà Nội, Vũng Tàu
 * - Bến xe: Miền Đông, Miền Tây, Liên tỉnh Đà Lạt, Nha Trang phía Nam
 */
exports.seed = async function (knex) {
  // Xóa dữ liệu cũ trước (tránh trùng lặp khi chạy seed nhiều lần)
  await knex('trips').del();
  await knex('routes').del();

  await knex('routes').insert([
    {
      name: 'TP.HCM - Đà Lạt',
      departure_province: 'TP.HCM',
      arrival_province: 'Đà Lạt',
      departure_station: 'Bến xe Miền Đông',
      arrival_station: 'Bến xe Liên tỉnh Đà Lạt',
      distance_km: 310,
      duration_minutes: 420, // 7 tiếng
      is_active: true,
    },
    {
      name: 'TP.HCM - Nha Trang',
      departure_province: 'TP.HCM',
      arrival_province: 'Nha Trang',
      departure_station: 'Bến xe Miền Đông',
      arrival_station: 'Bến xe Nha Trang phía Nam',
      distance_km: 440,
      duration_minutes: 540, // 9 tiếng
      is_active: true,
    },
    {
      name: 'TP.HCM - Cần Thơ',
      departure_province: 'TP.HCM',
      arrival_province: 'Cần Thơ',
      departure_station: 'Bến xe Miền Tây',
      arrival_station: 'Bến xe Cần Thơ',
      distance_km: 170,
      duration_minutes: 210, // 3.5 tiếng
      is_active: true,
    },
    {
      name: 'TP.HCM - Đà Nẵng',
      departure_province: 'TP.HCM',
      arrival_province: 'Đà Nẵng',
      departure_station: 'Bến xe Miền Đông',
      arrival_station: 'Bến xe Đà Nẵng',
      distance_km: 960,
      duration_minutes: 900, // 15 tiếng
      is_active: true,
    },
    {
      name: 'TP.HCM - Hà Nội',
      departure_province: 'TP.HCM',
      arrival_province: 'Hà Nội',
      departure_station: 'Bến xe Miền Đông',
      arrival_station: 'Bến xe Giáp Bát',
      distance_km: 1725,
      duration_minutes: 1440, // 24 tiếng
      is_active: true,
    },
    {
      name: 'TP.HCM - Vũng Tàu',
      departure_province: 'TP.HCM',
      arrival_province: 'Vũng Tàu',
      departure_station: 'Bến xe Miền Đông',
      arrival_station: 'Bến xe Vũng Tàu',
      distance_km: 90,
      duration_minutes: 120, // 2 tiếng
      is_active: true,
    },
  ]);

  console.log('[seed] ✓ Đã chèn 6 tuyến xe mẫu vào bảng routes');
};
