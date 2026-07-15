/**
 * Migration: Tạo bảng buses và seat_layout_templates
 *
 * ═══ THIẾT KẾ (Đặc tả 7.3) ════════════════════════════════════════════════
 *
 * buses — Thông tin xe vật lý (biển số, loại xe, sơ đồ ghế)
 *   Sơ đồ ghế được lưu dạng JSON array trong cột seat_layout.
 *   Mỗi phần tử là: { id, label, row, col, type, floor }
 *   Tránh khai báo lại sơ đồ ghế cho từng chuyến bằng cách lưu tại cấp xe.
 *
 * seat_layout_templates — Template sơ đồ ghế theo loại xe
 *   Ví dụ: SLEEPER_34, SEAT_29, LIMOUSINE_22
 *   Admin có thể clone từ template khi tạo xe mới.
 *
 * blocked_seats — Ghi lại ghế bị Admin khóa (BLOCKED) cho một chuyến cụ thể
 *   seat-service giữ trạng thái ghế trong Redis (ephemeral),
 *   admin-service ghi record bền vững vào Postgres để audit và replay.
 *
 * admin_events — Log sự kiện nghiệp vụ quan trọng (audit trail)
 *   Đặc tả 7.2 điểm 9: "Xem log các sự kiện chính: tạo chuyến, booking paid, check-in"
 * ═════════════════════════════════════════════════════════════════════════════
 */
exports.up = async function (knex) {

  // ── Bảng seat_layout_templates ────────────────────────────────────────────
  await knex.schema.createTable('seat_layout_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable().unique();       // SLEEPER_34 | SEAT_29 | LIMOUSINE_22
    t.string('display_name').notNullable();        // "34 Giường nằm", "29 Chỗ ngồi"
    t.integer('total_seats').notNullable();
    t.jsonb('layout').notNullable();               // Array cấu hình ghế
    t.text('description').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ── Bảng buses ────────────────────────────────────────────────────────────
  await knex.schema.createTable('buses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('license_plate', 20).notNullable().unique();  // Biển số xe: 51B-12345
    t.string('bus_type', 30).notNullable();                // SLEEPER_34 | SEAT_29 | LIMOUSINE_22
    t.integer('total_seats').notNullable();
    t.jsonb('seat_layout').notNullable();                  // Sơ đồ ghế thực tế của xe
    t.string('status', 20).notNullable().defaultTo('ACTIVE'); // ACTIVE | MAINTENANCE | INACTIVE
    t.text('notes').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    t.index(['status']);
    t.index(['bus_type']);
  });

  // ── Bảng blocked_seats ────────────────────────────────────────────────────
  await knex.schema.createTable('blocked_seats', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('trip_id').notNullable();
    t.string('seat_id').notNullable();
    t.string('admin_id').notNullable();    // Admin nào ra lệnh khóa
    t.text('reason').nullable();           // Lý do khóa
    t.boolean('is_active').notNullable().defaultTo(true); // false = đã mở khóa
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('unblocked_at').nullable();

    t.unique(['trip_id', 'seat_id']); // Mỗi ghế/chuyến chỉ có 1 record active
    t.index(['trip_id']);
  });

  // ── Bảng admin_events ─────────────────────────────────────────────────────
  await knex.schema.createTable('admin_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('event_type', 60).notNullable();  // checkin | block_seat | trip_status | booking_paid
    t.string('actor_id').notNullable();        // userId (admin/staff) hoặc 'system'
    t.string('actor_role', 20).notNullable().defaultTo('SYSTEM'); // ADMIN | STAFF | SYSTEM
    t.jsonb('payload').notNullable();          // Chi tiết sự kiện
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['event_type']);
    t.index(['created_at']);
    t.index(['actor_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('admin_events');
  await knex.schema.dropTableIfExists('blocked_seats');
  await knex.schema.dropTableIfExists('buses');
  await knex.schema.dropTableIfExists('seat_layout_templates');
};
