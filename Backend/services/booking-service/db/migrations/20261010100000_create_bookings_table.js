/**
 * Migration: Tạo bảng bookings và passengers
 *
 * bookings — Đơn đặt vé, state machine chính
 * passengers — Thông tin hành khách (1 passenger per seat)
 *
 * State machine booking:
 *   PENDING_PAYMENT → PAID → TICKET_ISSUED → CHECKED_IN → COMPLETED
 *   PENDING_PAYMENT → EXPIRED
 *   PAID → CANCELLED
 */
exports.up = async function (knex) {
  // ── Bảng bookings ─────────────────────────────────────────────────────────
  await knex.schema.createTable('bookings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    t.string('user_id').notNullable();   // userId (có thể là "guest" nếu guest checkout)
    t.string('trip_id').notNullable();   // tripId từ trip-service
    t.specificType('seat_ids', 'TEXT[]').notNullable(); // Mảng seatId đã chọn

    // Trạng thái theo state machine (Đặc tả 6.2)
    t.string('status', 30).notNullable().defaultTo('PENDING_PAYMENT');
    // PENDING_PAYMENT | PAID | TICKET_ISSUED | CHECKED_IN | COMPLETED | EXPIRED | CANCELLED

    t.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
    t.string('payment_method', 50).nullable(); // VNPay | Momo | CreditCard

    // Expires_at: booking hết hạn nếu không thanh toán trong TTL ghế (5 phút)
    t.timestamp('expires_at').nullable();

    // Timestamps
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('paid_at').nullable();
    t.timestamp('cancelled_at').nullable();

    // Index tìm kiếm theo userId và tripId
    t.index(['user_id']);
    t.index(['trip_id']);
    t.index(['status']);
  });

  // ── Bảng passengers ───────────────────────────────────────────────────────
  await knex.schema.createTable('passengers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    t.uuid('booking_id').notNullable()
      .references('id').inTable('bookings')
      .onDelete('CASCADE');

    t.string('seat_id').notNullable();     // Ghế của hành khách này
    t.string('seat_number', 20).notNullable(); // Ví dụ: A01, B02

    // Thông tin hành khách (Đặc tả 6.3 điểm 1)
    t.string('full_name').notNullable();
    t.string('phone', 20).notNullable();
    t.string('email', 200).nullable();
    t.string('id_number', 50).nullable(); // CMND/CCCD (tùy chọn)

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['booking_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('passengers');
  await knex.schema.dropTableIfExists('bookings');
};
