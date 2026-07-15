/**
 * Migration: Tạo bảng outbox_events cho booking-service
 *
 * Outbox Pattern: Thay vì publish trực tiếp lên RabbitMQ/Kafka trong cùng
 * transaction, service ghi sự kiện vào bảng này trước. outboxWorker.js
 * sẽ đọc và publish bất đồng bộ, đảm bảo at-least-once delivery.
 *
 * Tại sao cần Outbox Pattern?
 * - Nếu service crash sau khi commit DB nhưng trước khi publish → mất event
 * - Outbox đảm bảo event và data thay đổi được commit trong cùng 1 transaction
 * - Worker retry các event chưa được gửi
 */
exports.up = async function (knex) {
  await knex.schema.createTable('outbox_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Loại event: booking.paid, booking.cancelled, booking.expired
    t.string('event_type', 100).notNullable();

    // Dữ liệu event dưới dạng JSON
    t.jsonb('payload').notNullable();

    // Trạng thái publish: pending | published | failed
    t.string('status', 20).notNullable().defaultTo('pending');

    // Số lần thử publish (tránh retry vô hạn)
    t.integer('attempts').notNullable().defaultTo(0);

    // Lần cuối thử publish
    t.timestamp('last_attempted_at').nullable();

    // Lỗi cuối cùng (nếu có)
    t.text('last_error').nullable();

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('published_at').nullable();

    // Index để outboxWorker poll hiệu quả
    t.index(['status', 'created_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('outbox_events');
};
