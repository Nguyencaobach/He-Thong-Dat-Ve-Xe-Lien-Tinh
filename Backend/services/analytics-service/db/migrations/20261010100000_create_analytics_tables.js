exports.up = function(knex) {
  return knex.schema
    .createTable('daily_revenue', (table) => {
      table.date('date').primary();
      table.decimal('total_revenue', 14, 2).defaultTo(0);
      table.integer('total_bookings').defaultTo(0);
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('route_metrics', (table) => {
      table.string('route_id').primary(); // departure-destination
      table.integer('search_count').defaultTo(0);
      table.integer('booking_count').defaultTo(0);
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('route_metrics')
    .dropTableIfExists('daily_revenue');
};
