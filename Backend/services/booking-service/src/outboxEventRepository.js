/**
 * outboxEventRepository.js - Quản lý bảng outbox_events trong booking_db
 */
const db = require('./db');

const MAX_ATTEMPTS = parseInt(process.env.BOOKING_OUTBOX_MAX_ATTEMPTS) || 5;

const outboxEventRepository = {

  /**
   * Lấy batch các event chưa publish (status = pending hoặc failed với attempts < max)
   */
  async getPendingEvents(batchSize = 20) {
    return db('outbox_events')
      .where('status', 'pending')
      .orWhere(function () {
        this.where('status', 'failed').where('attempts', '<', MAX_ATTEMPTS);
      })
      .orderBy('created_at', 'asc')
      .limit(batchSize);
  },

  /**
   * Đánh dấu event đã publish thành công
   */
  async markPublished(id) {
    return db('outbox_events').where({ id }).update({
      status:       'published',
      published_at: db.fn.now(),
    });
  },

  /**
   * Đánh dấu event thất bại (tăng attempts, ghi lỗi)
   */
  async markFailed(id, errorMessage) {
    return db('outbox_events').where({ id }).update({
      status:            'failed',
      attempts:          db.raw('attempts + 1'),
      last_attempted_at: db.fn.now(),
      last_error:        errorMessage,
    });
  },

  /**
   * Tạo event mới trong outbox (dùng ngoài transaction)
   */
  async create(eventType, payload) {
    const [event] = await db('outbox_events').insert({
      event_type: eventType,
      payload:    JSON.stringify(payload),
      status:     'pending',
    }).returning('*');
    return event;
  },
};

module.exports = outboxEventRepository;
