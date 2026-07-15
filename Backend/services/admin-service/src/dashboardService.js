/**
 * dashboardService.js - Tổng hợp thống kê cho Admin Dashboard
 * Sẽ được mở rộng ở Giai đoạn 8 khi analytics-consumer sẵn sàng.
 */
const db = require('./db');

const dashboardService = {
  async getStats(date) {
    const [busStats] = await db('buses')
      .select(db.raw('COUNT(*) as total_buses, COUNT(*) FILTER (WHERE status = \'ACTIVE\') as active_buses'))
      .first();

    const recentEvents = await db('admin_events')
      .orderBy('created_at', 'desc')
      .limit(10);

    return {
      totalBuses:    parseInt(busStats?.total_buses  || 0),
      activeBuses:   parseInt(busStats?.active_buses || 0),
      recentEvents,
    };
  },
};

module.exports = dashboardService;
