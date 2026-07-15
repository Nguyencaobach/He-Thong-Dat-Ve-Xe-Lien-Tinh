/**
 * Seed: 02_trips.js
 * Chèn chuyến xe mẫu cho 7 ngày tới.
 * Mỗi tuyến có 2-3 chuyến/ngày (sáng, chiều, tối).
 */
exports.seed = async function (knex) {
  // Lấy tất cả routes đã seed
  const routes = await knex('routes').select('*');
  const routeMap = {};
  routes.forEach((r) => { routeMap[r.name] = r; });

  const trips = [];

  // Tạo chuyến cho 7 ngày tới
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + dayOffset);
    const dateStr = baseDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // ── TP.HCM → Đà Lạt (3 chuyến/ngày)
    const hcmDaLat = routeMap['TP.HCM - Đà Lạt'];
    if (hcmDaLat) {
      [
        { hour: 6, price: 250000, bus: 'LIMOUSINE_22', seats: 22 },
        { hour: 13, price: 280000, bus: 'SLEEPER_34', seats: 34 },
        { hour: 22, price: 300000, bus: 'LIMOUSINE_22', seats: 22 },
      ].forEach(({ hour, price, bus, seats }) => {
        const dep = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00+07:00`);
        const arr = new Date(dep.getTime() + hcmDaLat.duration_minutes * 60000);
        trips.push({
          route_id: hcmDaLat.id,
          bus_type: bus,
          departure_time: dep,
          arrival_time: arr,
          base_price: price,
          total_seats: seats,
          available_seats: seats,
          status: 'SCHEDULED',
        });
      });
    }

    // ── TP.HCM → Nha Trang (2 chuyến/ngày)
    const hcmNhaTrang = routeMap['TP.HCM - Nha Trang'];
    if (hcmNhaTrang) {
      [
        { hour: 7, price: 320000, bus: 'SLEEPER_34', seats: 34 },
        { hour: 20, price: 350000, bus: 'LIMOUSINE_22', seats: 22 },
      ].forEach(({ hour, price, bus, seats }) => {
        const dep = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00+07:00`);
        const arr = new Date(dep.getTime() + hcmNhaTrang.duration_minutes * 60000);
        trips.push({
          route_id: hcmNhaTrang.id,
          bus_type: bus,
          departure_time: dep,
          arrival_time: arr,
          base_price: price,
          total_seats: seats,
          available_seats: seats,
          status: 'SCHEDULED',
        });
      });
    }

    // ── TP.HCM → Cần Thơ (3 chuyến/ngày)
    const hcmCanTho = routeMap['TP.HCM - Cần Thơ'];
    if (hcmCanTho) {
      [
        { hour: 6, price: 120000, bus: 'SEAT_29', seats: 29 },
        { hour: 12, price: 120000, bus: 'SEAT_29', seats: 29 },
        { hour: 17, price: 130000, bus: 'LIMOUSINE_22', seats: 22 },
      ].forEach(({ hour, price, bus, seats }) => {
        const dep = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00+07:00`);
        const arr = new Date(dep.getTime() + hcmCanTho.duration_minutes * 60000);
        trips.push({
          route_id: hcmCanTho.id,
          bus_type: bus,
          departure_time: dep,
          arrival_time: arr,
          base_price: price,
          total_seats: seats,
          available_seats: seats,
          status: 'SCHEDULED',
        });
      });
    }

    // ── TP.HCM → Đà Nẵng (1 chuyến/ngày, đêm)
    const hcmDaNang = routeMap['TP.HCM - Đà Nẵng'];
    if (hcmDaNang) {
      const dep = new Date(`${dateStr}T18:00:00+07:00`);
      const arr = new Date(dep.getTime() + hcmDaNang.duration_minutes * 60000);
      trips.push({
        route_id: hcmDaNang.id,
        bus_type: 'SLEEPER_34',
        departure_time: dep,
        arrival_time: arr,
        base_price: 450000,
        total_seats: 34,
        available_seats: 34,
        status: 'SCHEDULED',
      });
    }

    // ── TP.HCM → Vũng Tàu (4 chuyến/ngày)
    const hcmVungTau = routeMap['TP.HCM - Vũng Tàu'];
    if (hcmVungTau) {
      [7, 11, 14, 17].forEach((hour) => {
        const dep = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00+07:00`);
        const arr = new Date(dep.getTime() + hcmVungTau.duration_minutes * 60000);
        trips.push({
          route_id: hcmVungTau.id,
          bus_type: 'SEAT_29',
          departure_time: dep,
          arrival_time: arr,
          base_price: 80000,
          total_seats: 29,
          available_seats: 29,
          status: 'SCHEDULED',
        });
      });
    }
  }

  await knex('trips').insert(trips);
  console.log(`[seed] ✓ Đã chèn ${trips.length} chuyến xe mẫu (7 ngày tới) vào bảng trips`);
};
