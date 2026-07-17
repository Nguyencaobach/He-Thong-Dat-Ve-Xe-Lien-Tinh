const db = require('./services/trip-service/src/db');
async function fix() {
  const routes = await db('routes').where({ departure_province: 'TP.HCM', arrival_province: 'Đà Lạt' });
  const route = routes[0];
  if (route) {
    const trips = await db('trips').where({ route_id: route.id }).whereRaw(`departure_time::date = '2026-07-17'`);
    if (trips.length > 0) {
      await db('trips').where({ id: trips[0].id }).update({ available_seats: 21 });
      console.log('Fixed trip:', trips[0].id);
    }
  }
  process.exit(0);
}
fix();
