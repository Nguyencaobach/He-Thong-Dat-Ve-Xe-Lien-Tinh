const Redis = require('ioredis');
const tripRepository = require('./tripRepository');
const tripCache = require('./tripCache');
require('dotenv').config();

const SEAT_EVENTS_CHANNEL = process.env.SEAT_EVENTS_CHANNEL || 'seat_status_updates';

const redisSubscriber = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
});

redisSubscriber.on('ready', () => {
  console.log('[trip-service] ✓ Redis Subscriber ready');
  redisSubscriber.subscribe(SEAT_EVENTS_CHANNEL, (err, count) => {
    if (err) console.error('[trip-service] Subscribe error:', err.message);
    else console.log(`[trip-service] Subscribed to ${SEAT_EVENTS_CHANNEL} (${count} channel)`);
  });
});

redisSubscriber.on('message', async (channel, message) => {
  if (channel === SEAT_EVENTS_CHANNEL) {
    try {
      const event = JSON.parse(message);
      const { tripId, status, occupiedSeats } = event;
      
      // Lấy trip hiện tại
      const trip = await tripRepository.findById(tripId);
      if (!trip) return;

      // Tính availableSeats dựa trên total_seats của trip và số ghế thực tế đang bị chiếm
      if (occupiedSeats !== null && occupiedSeats !== undefined) {
        const availableSeats = Math.max(0, parseInt(trip.total_seats) - occupiedSeats);
        await tripRepository.updateAvailableSeats(tripId, availableSeats);
        console.log(`[trip-service] Cập nhật ghế trip ${tripId}: available=${availableSeats} (total=${trip.total_seats}, occupied=${occupiedSeats})`);
      }
      
      // Invalidate Cache cho mọi loại thay đổi trạng thái ghế
      if (trip.departure_time) {
        const d = new Date(trip.departure_time);
        const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
        const dateStr = vnTime.toISOString().split('T')[0];
        await tripCache.clearSearchResult(trip.departure_province, trip.arrival_province, dateStr);
      }
    } catch (err) {
      console.warn('[trip-service] Error processing seat event:', err.message);
    }
  }
});

module.exports = redisSubscriber;
