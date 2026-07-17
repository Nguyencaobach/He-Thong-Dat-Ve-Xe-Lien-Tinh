const db = require('./services/trip-service/src/db');
async function run() {
  const routes = await db('routes').select('*');
  console.log(routes);
  process.exit(0);
}
run();
