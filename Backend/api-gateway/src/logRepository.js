const pool = require('./db');

const logRepository = {
  async createLog({ userEmail, action, entity, details }) {
    try {
      await pool.query(
        `INSERT INTO event_logs (user_email, action, entity, details)
         VALUES ($1, $2, $3, $4)`,
        [userEmail, action, entity, JSON.stringify(details)]
      );
    } catch (err) {
      console.error('Lỗi khi ghi event log:', err);
    }
  },

  async listLogs({ limit = 20, offset = 0, date }) {
    let query = 'SELECT id, user_email, action, entity, details, created_at FROM event_logs';
    const values = [];

    if (date) {
      query += ' WHERE DATE(created_at) = $1';
      values.push(date);
    }

    query += ' ORDER BY created_at DESC';

    // Count total
    const countQuery = date 
      ? 'SELECT COUNT(*) FROM event_logs WHERE DATE(created_at) = $1'
      : 'SELECT COUNT(*) FROM event_logs';
    
    const totalResult = await pool.query(countQuery, date ? [date] : []);
    const total = parseInt(totalResult.rows[0].count, 10);

    // Add pagination
    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    return {
      logs: result.rows.map(row => ({
        id: row.id,
        userEmail: row.user_email,
        action: row.action,
        entity: row.entity,
        details: typeof row.details === 'string' ? row.details : JSON.stringify(row.details),
        createdAt: row.created_at.toISOString()
      })),
      total
    };
  },

  async deleteLogsByDate(date) {
    const result = await pool.query(
      'DELETE FROM event_logs WHERE DATE(created_at) = $1',
      [date]
    );
    return result.rowCount;
  }
};

module.exports = logRepository;
