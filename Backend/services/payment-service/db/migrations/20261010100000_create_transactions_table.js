/**
 * Migration: Tạo bảng transactions cho payment-service
 */
exports.up = async function (knex) {
  await knex.schema.createTable('transactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('booking_id').notNullable();
    t.string('transaction_id').notNullable().unique();
    t.decimal('amount', 12, 2).notNullable();
    t.string('payment_method', 50).notNullable();
    t.string('status', 20).notNullable(); // SUCCESS | FAILED | PENDING
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['booking_id']);
    t.index(['transaction_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('transactions');
};
