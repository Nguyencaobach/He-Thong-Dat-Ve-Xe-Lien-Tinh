/**
 * Migration: Tạo bảng routes (Tuyến xe)
 *
 * Tuyến xe là lộ trình CỐ ĐỊNH không thay đổi theo ngày.
 * Ví dụ: "TP.HCM → Đà Lạt" là 1 tuyến, chạy hàng ngày nhiều chuyến khác nhau.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('routes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Thông tin tuyến
    table.string('name', 200).notNullable();              // "TP.HCM - Đà Lạt"
    table.string('departure_province', 100).notNullable();  // "TP.HCM"
    table.string('arrival_province', 100).notNullable();    // "Đà Lạt"
    table.string('departure_station', 200).notNullable();   // "Bến xe Miền Đông"
    table.string('arrival_station', 200).notNullable();     // "Bến xe Liên tỉnh Đà Lạt"

    // Thông tin kỹ thuật
    table.integer('distance_km').notNullable();           // 310 km
    table.integer('duration_minutes').notNullable();      // 420 phút (~7h)

    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true); // created_at, updated_at
  });

  // Index tìm kiếm autocomplete theo tỉnh/thành
  await knex.raw(`
    CREATE INDEX idx_routes_departure ON routes (departure_province);
    CREATE INDEX idx_routes_arrival ON routes (arrival_province);
    CREATE INDEX idx_routes_active ON routes (is_active);
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('routes');
};
