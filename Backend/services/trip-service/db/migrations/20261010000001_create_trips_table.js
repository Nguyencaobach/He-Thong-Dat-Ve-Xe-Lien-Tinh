/**
 * Migration: Tạo bảng trips (Chuyến xe cụ thể)
 *
 * Mỗi Trip là một lượt chạy thực tế của một Tuyến:
 * - Route "TP.HCM → Đà Lạt" + ngày 20/07 + xe 51A-123 + giờ 07:00 = 1 Trip
 *
 * Quan hệ: trips.route_id → routes.id (many-to-one)
 */
exports.up = async function (knex) {
  await knex.schema.createTable('trips', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Tham chiếu tuyến xe
    table.uuid('route_id').notNullable()
      .references('id').inTable('routes')
      .onDelete('CASCADE');

    // Thông tin xe chạy chuyến này (bus_id từ admin-service, lưu dạng string)
    table.string('bus_id', 50).nullable();
    table.string('bus_type', 50).notNullable().defaultTo('LIMOUSINE');
    // Loại xe: SEAT_29 (ngồi 29 chỗ), SLEEPER_34 (giường nằm 34), LIMOUSINE_22

    // Thời gian
    table.timestamp('departure_time').notNullable();  // Giờ khởi hành
    table.timestamp('arrival_time').notNullable();    // Giờ đến dự kiến

    // Giá và ghế
    table.decimal('base_price', 10, 0).notNullable(); // Giá vé (VNĐ)
    table.integer('total_seats').notNullable();        // Tổng số ghế
    table.integer('available_seats').notNullable();    // Ghế còn trống (sync từ seat-service)

    // Trạng thái chuyến
    table.string('status', 30).notNullable().defaultTo('SCHEDULED');
    // SCHEDULED: Sắp chạy | ACTIVE: Đang chạy | COMPLETED: Hoàn thành | CANCELLED: Hủy

    table.timestamps(true, true);
  });

  // Index tìm kiếm chuyến theo route + ngày (query phổ biến nhất)
  await knex.raw(`
    CREATE INDEX idx_trips_route_date ON trips (route_id, departure_time);
    CREATE INDEX idx_trips_status ON trips (status);
    CREATE INDEX idx_trips_departure_time ON trips (departure_time);
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('trips');
};
