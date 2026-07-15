const { Kafka } = require('kafkajs');
const db = require('./db');

const kafka = new Kafka({
  clientId: 'analytics-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer = kafka.consumer({ groupId: 'analytics-group' });

async function connect() {
  await consumer.connect();
  console.log('[analytics-service] ✓ Kết nối Kafka Consumer thành công');
  
  await consumer.subscribe({ topics: ['search-events', 'booking-events', 'payment-events'], fromBeginning: true });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        await processEvent(topic, payload);
      } catch (err) {
        console.error(`[analytics-service] Lỗi xử lý message topic ${topic}:`, err.message);
      }
    },
  });
}

async function processEvent(topic, payload) {
  if (topic === 'search-events') {
    const routeId = `${payload.departure}-${payload.destination}`;
    await db.raw(`
      INSERT INTO route_metrics (route_id, search_count, updated_at) 
      VALUES (?, 1, NOW()) 
      ON CONFLICT (route_id) 
      DO UPDATE SET search_count = route_metrics.search_count + 1, updated_at = NOW()
    `, [routeId]);
  } 
  else if (topic === 'booking-events' && payload.eventType === 'BOOKING_PAID') {
    // payload.totalAmount, payload.tripId...
    // Tạm bỏ qua booking_events để tính doanh thu theo payment_events cho chuẩn, 
    // hoặc có thể tính booking_count ở đây.
    
    // Cập nhật conversion (tạm ghi nhận là 1 booking_count)
    if (payload.departure && payload.destination) {
      const routeId = `${payload.departure}-${payload.destination}`;
      await db.raw(`
        INSERT INTO route_metrics (route_id, booking_count, updated_at) 
        VALUES (?, 1, NOW()) 
        ON CONFLICT (route_id) 
        DO UPDATE SET booking_count = route_metrics.booking_count + 1, updated_at = NOW()
      `, [routeId]);
    }
  }
  else if (topic === 'payment-events' && payload.eventType === 'PAYMENT_PROCESSED') {
    // Tăng daily_revenue
    const today = new Date().toISOString().split('T')[0];
    await db.raw(`
      INSERT INTO daily_revenue (date, total_revenue, total_bookings, updated_at) 
      VALUES (?, ?, 1, NOW()) 
      ON CONFLICT (date) 
      DO UPDATE SET 
        total_revenue = daily_revenue.total_revenue + ?, 
        total_bookings = daily_revenue.total_bookings + 1,
        updated_at = NOW()
    `, [today, payload.amount, payload.amount]);
  }
}

module.exports = { connect };
