/**
 * Migration: Thêm các cột pick_up_point, drop_off_point, distance vào bảng trips
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('trips', (table) => {
    table.string('pick_up_point', 255).nullable();
    table.string('drop_off_point', 255).nullable();
    table.integer('distance').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('trips', (table) => {
    table.dropColumn('pick_up_point');
    table.dropColumn('drop_off_point');
    table.dropColumn('distance');
  });
};
