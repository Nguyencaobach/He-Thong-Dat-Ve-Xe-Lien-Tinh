/**
 * outboxEventRepository.js - Tầng DB cho Outbox Pattern
 *
 * Outbox Pattern đảm bảo event KHÔNG BỊ MẤT:
 * - Lưu event vào DB trong cùng transaction (đảm bảo atomicity)
 * - Worker poll DB và đẩy lên Kafka sau
 */
const db = require('./db');

const MAX_ATTEMPTS = parseInt(process.env.TRIP_OUTBOX_MAX_ATTEMPTS) || 5;

const outboxEventRepository = {
  /**
   * Lưu event tìm kiếm vào outbox
   * @param {object} searchData - { departure, destination, date, resultCount }
   */
  async saveSearchEvent({ departure, destination, date, resultCount }) {
    await db('outbox_events').insert({
      event_type: 'search.performed',
      topic: 'search-events',
      version: 1,
      payload: JSON.stringify({
        departure,
        destination,
        date,
        result_count: resultCount,
        searched_at: new Date().toISOString(),
      }),
      status: 'pending',
    });
  },

  /**
   * Lấy batch events đang pending và lock chúng (tránh xử lý trùng)
   */
  async reservePendingEvents(limit = 20) {
    return db.transaction(async (trx) => {
      const rows = await trx('outbox_events')
        .select('*')
        .where({ status: 'pending' })
        .andWhere('attempts', '<', MAX_ATTEMPTS)
        .orderBy('created_at', 'asc')
        .limit(limit)
        .forUpdate()      // Lock rows
        .skipLocked();    // Skip rows đang bị lock bởi worker khác

      if (rows.length === 0) return [];

      // Đánh dấu "đang xử lý" để tránh worker khác nhặt trùng
      await trx('outbox_events')
        .whereIn('id', rows.map((r) => r.id))
        .update({ status: 'publishing', updated_at: trx.fn.now() });

      return rows;
    });
  },

  /**
   * Đánh dấu event đã publish thành công
   */
  async markPublished(eventId) {
    await db('outbox_events').where({ id: eventId }).update({
      status: 'published',
      published_at: db.fn.now(),
      updated_at: db.fn.now(),
      last_error: null,
    });
  },

  /**
   * Đánh dấu event thất bại, tăng attempts
   */
  async markFailed(eventId, error) {
    const row = await db('outbox_events').select('attempts').where({ id: eventId }).first();
    const nextAttempts = Number(row?.attempts ?? 0) + 1;

    await db('outbox_events').where({ id: eventId }).update({
      attempts: nextAttempts,
      status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
      last_error: String(error?.message ?? error).slice(0, 1000),
      updated_at: db.fn.now(),
    });
  },

  /**
   * Reset các event bị stuck ở trạng thái "publishing" (do worker crash)
   */
  async resetStuckEvents() {
    await db('outbox_events')
      .where({ status: 'publishing' })
      .update({ status: 'pending', updated_at: db.fn.now() });
  },
};

module.exports = outboxEventRepository;
