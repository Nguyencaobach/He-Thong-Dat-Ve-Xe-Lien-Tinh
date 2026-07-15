/**
 * Seed: Chèn 3 template sơ đồ ghế chuẩn (Đặc tả 7.3)
 *
 * Templates:
 *   1. SLEEPER_34  — 34 giường nằm (2 tầng, 2 cột)
 *   2. SEAT_29     — 29 chỗ ngồi (1 tầng, 5 cột)
 *   3. LIMOUSINE_22 — 22 ghế limousine (1 tầng, 4 cột, rộng hơn)
 *
 * layout là mảng JSON: mỗi phần tử { id, label, row, col, floor, type }
 *   - floor: 1 (tầng dưới) | 2 (tầng trên)
 *   - type: NORMAL | DRIVER (tài xế) | AISLE (lối đi)
 */

function generateSleeperLayout() {
  const seats = [];
  const cols = ['A', 'B', 'C', 'D'];
  let count = 1;
  for (let floor = 1; floor <= 2; floor++) {
    for (let row = 1; row <= 9; row++) {
      // Mỗi hàng 2 ghế, trừ hàng cuối 1 ghế (tổng 34)
      const colsInRow = (floor === 1 && row === 9) ? ['A'] : ['A', 'B'];
      for (const col of colsInRow) {
        if (count > 34) break;
        seats.push({
          id:    `${floor === 1 ? 'L' : 'U'}${String(count).padStart(2, '0')}`,
          label: `${floor === 1 ? 'L' : 'U'}${String(count).padStart(2, '0')}`,
          row,
          col: col === 'A' ? 1 : 2,
          floor,
          type: 'NORMAL',
        });
        count++;
      }
    }
  }
  return seats;
}

function generateSeat29Layout() {
  const seats = [];
  // Hàng 1: 2 ghế (A, B) — hàng đầu
  // Hàng 2-7: 4 ghế mỗi hàng (A, B, C, D) — 6 * 4 = 24 ghế
  // Hàng 8: 3 ghế (A, B, C) — hàng cuối
  // Tổng: 2 + 24 + 3 = 29
  let count = 1;
  const rowConfigs = [
    ['A', 'B'],           // Hàng 1: 2 ghế
    ['A', 'B', 'C', 'D'], // Hàng 2-7
    ['A', 'B', 'C', 'D'],
    ['A', 'B', 'C', 'D'],
    ['A', 'B', 'C', 'D'],
    ['A', 'B', 'C', 'D'],
    ['A', 'B', 'C', 'D'],
    ['A', 'B', 'C'],      // Hàng 8: 3 ghế
  ];
  rowConfigs.forEach((cols, rowIdx) => {
    const row = rowIdx + 1;
    cols.forEach((col, colIdx) => {
      seats.push({
        id:    `${col}${String(row).padStart(2, '0')}`,
        label: `${col}${String(row).padStart(2, '0')}`,
        row,
        col:   colIdx + 1,
        floor: 1,
        type:  'NORMAL',
      });
      count++;
    });
  });
  return seats;
}

function generateLimousine22Layout() {
  const seats = [];
  // 22 ghế, 11 hàng × 2 ghế (A, B), rộng rãi
  let count = 1;
  for (let row = 1; row <= 11; row++) {
    ['A', 'B'].forEach((col, colIdx) => {
      seats.push({
        id:    `${col}${String(row).padStart(2, '0')}`,
        label: `${col}${String(row).padStart(2, '0')}`,
        row,
        col:   colIdx + 1,
        floor: 1,
        type:  'NORMAL',
      });
      count++;
    });
  }
  return seats;
}

exports.seed = async function (knex) {
  await knex('seat_layout_templates').del();

  await knex('seat_layout_templates').insert([
    {
      name:         'SLEEPER_34',
      display_name: '34 Giường nằm (2 tầng)',
      total_seats:  34,
      layout:       JSON.stringify(generateSleeperLayout()),
      description:  'Xe giường nằm 2 tầng, 34 giường. Phù hợp tuyến đường dài.',
    },
    {
      name:         'SEAT_29',
      display_name: '29 Chỗ ngồi (1 tầng)',
      total_seats:  29,
      layout:       JSON.stringify(generateSeat29Layout()),
      description:  'Xe 29 ghế ngồi 1 tầng. Phù hợp tuyến đường ngắn và trung bình.',
    },
    {
      name:         'LIMOUSINE_22',
      display_name: '22 Ghế limousine (1 tầng)',
      total_seats:  22,
      layout:       JSON.stringify(generateLimousine22Layout()),
      description:  'Xe limousine cao cấp, 22 ghế rộng rãi. Phù hợp dịch vụ VIP.',
    },
  ]);

  console.log('[admin-seed] ✓ Đã chèn 3 seat_layout_templates: SLEEPER_34, SEAT_29, LIMOUSINE_22');
};
