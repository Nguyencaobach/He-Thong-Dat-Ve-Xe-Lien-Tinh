/**
 * Migration: Tạo bảng outbox_events (Outbox Pattern)
 *
 * Mục đích: Đảm bảo event KHÔNG BỊ MẤT khi Kafka tạm thời không khả dụng.
 * Luồng:
 *   1. Khách tìm chuyến → lưu event vào bảng này (cùng transaction với business logic)
 *   2. outboxWorker.js poll bảng này mỗi 2 giây → đẩy lên Kafka topic search-events
 *   3. Đánh dấu event là published
 *
 * Trạng thái event: pending → publishing → published / failed
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('outbox_events');
  if (exists) return;

  await knex.schema.createTable('outbox_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.string('event_type', 100).notNullable();    // 'search.performed'
    table.string('topic', 100).notNullable();         // 'search-events' (Kafka topic)
    table.integer('version').notNullable().defaultTo(1);
    table.jsonb('payload').notNullable();             // Nội dung event
    table.string('correlation_id', 100).nullable();   // Trace ID

    // Quản lý trạng thái xử lý
    table.string('status', 30).notNullable().defaultTo('pending');
    // pending → publishing → published / failed
    table.integer('attempts').notNullable().defaultTo(0);
    table.text('last_error').nullable();
    table.timestamp('published_at').nullable();

    table.timestamps(true, true);

    // Index để worker query nhanh
    table.index(['status', 'created_at']);
    table.index(['event_type']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('outbox_events');
};
