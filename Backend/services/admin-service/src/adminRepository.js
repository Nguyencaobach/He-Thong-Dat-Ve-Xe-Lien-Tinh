/**
 * adminRepository.js - Tầng dữ liệu: giao tiếp với admin_db
 *
 * Quản lý: buses, seat_layout_templates, blocked_seats, admin_events
 */
const db = require('./db');

const adminRepository = {

  // ═══════════════════════════════════════════════════════════════════════════
  // BUS CRUD (Đặc tả 7.2 điểm 2)
  // ═══════════════════════════════════════════════════════════════════════════

  async createBus({ licensePlate, busType, totalSeats, seatLayout, status, notes }) {
    const [bus] = await db('buses').insert({
      license_plate: licensePlate,
      bus_type:      busType,
      total_seats:   totalSeats,
      seat_layout:   JSON.stringify(seatLayout),
      status:        status || 'ACTIVE',
      notes:         notes  || null,
    }).returning('*');
    return bus;
  },

  async findBusById(busId) {
    return db('buses').where({ id: busId }).first();
  },

  async listBuses({ status, limit = 20, offset = 0 }) {
    const query = db('buses').orderBy('created_at', 'desc').limit(limit).offset(offset);
    if (status) query.where({ status });
    const [buses, [{ count }]] = await Promise.all([
      query,
      db('buses').modify((q) => { if (status) q.where({ status }); }).count('id as count'),
    ]);
    return { buses, total: parseInt(count) };
  },

  async updateBus(busId, updates) {
    const [updated] = await db('buses')
      .where({ id: busId })
      .update({ ...updates, updated_at: db.fn.now() })
      .returning('*');
    return updated;
  },

  async deleteBus(busId) {
    return db('buses').where({ id: busId }).del();
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEAT LAYOUT TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  async listTemplates() {
    return db('seat_layout_templates').orderBy('name');
  },

  async findTemplateByName(name) {
    return db('seat_layout_templates').where({ name }).first();
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCKED SEATS (Đặc tả 7.2 điểm 8)
  // ═══════════════════════════════════════════════════════════════════════════

  async blockSeat({ tripId, seatId, adminId, reason }) {
    // Upsert: nếu đã có record cho (tripId, seatId) thì activate lại
    const existing = await db('blocked_seats').where({ trip_id: tripId, seat_id: seatId }).first();
    if (existing) {
      const [updated] = await db('blocked_seats')
        .where({ id: existing.id })
        .update({ is_active: true, admin_id: adminId, reason, unblocked_at: null, created_at: db.fn.now() })
        .returning('*');
      return updated;
    }
    const [record] = await db('blocked_seats').insert({
      trip_id:  tripId,
      seat_id:  seatId,
      admin_id: adminId,
      reason:   reason || null,
    }).returning('*');
    return record;
  },

  async unblockSeat({ tripId, seatId }) {
    const [updated] = await db('blocked_seats')
      .where({ trip_id: tripId, seat_id: seatId, is_active: true })
      .update({ is_active: false, unblocked_at: db.fn.now() })
      .returning('*');
    return updated;
  },

  async getBlockedSeatsByTrip(tripId) {
    return db('blocked_seats').where({ trip_id: tripId, is_active: true });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN EVENTS — Audit Log (Đặc tả 7.2 điểm 9)
  // ═══════════════════════════════════════════════════════════════════════════

  async logEvent({ eventType, actorId, actorRole, payload }) {
    const [event] = await db('admin_events').insert({
      event_type: eventType,
      actor_id:   actorId   || 'system',
      actor_role: actorRole || 'SYSTEM',
      payload:    JSON.stringify(payload),
    }).returning('*');
    return event;
  },

  async getRecentEvents({ eventType, limit = 50, offset = 0 }) {
    const query = db('admin_events').orderBy('created_at', 'desc').limit(limit).offset(offset);
    if (eventType) query.where({ event_type: eventType });
    return query;
  },
};

module.exports = adminRepository;
