const db = require('./services/trip-service/src/db');
async function run() {
  const trips = await db('trips').select('*');
  console.log(trips);
  process.exit(0);
}
run();
