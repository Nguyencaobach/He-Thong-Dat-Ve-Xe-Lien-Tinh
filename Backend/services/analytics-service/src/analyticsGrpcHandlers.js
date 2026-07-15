const db = require('./db');

async function GetDashboardStats(call, callback) {
  try {
    const { date } = call.request;
    
    // Nếu có date, query theo date, không thì lấy tổng (ví dụ hôm nay)
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    const dailyRev = await db('daily_revenue').where('date', queryDate).first();
    const routeMetrics = await db('route_metrics').sum('search_count as totalSearchCount');
    
    const totalBookings = dailyRev ? parseInt(dailyRev.total_bookings) : 0;
    const totalRevenue = dailyRev ? parseFloat(dailyRev.total_revenue) : 0;
    const totalSearchCount = routeMetrics[0] && routeMetrics[0].totalSearchCount ? parseInt(routeMetrics[0].totalSearchCount) : 0;
    
    callback(null, {
      totalBookings,
      totalRevenue,
      totalSearchCount
    });
  } catch (err) {
    console.error('[analytics-service] Lỗi GetDashboardStats:', err.message);
    callback({
      code: 13, // INTERNAL
      message: err.message
    });
  }
}

module.exports = {
  GetDashboardStats
};
