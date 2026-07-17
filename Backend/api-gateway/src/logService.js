const logRepository = require('./logRepository');

const logService = {
  logEvent(userEmail, action, entity, details = {}) {
    // Fire and forget (don't wait for it to complete)
    logRepository.createLog({ userEmail, action, entity, details }).catch(err => {
      console.error('Lỗi khi ghi event log:', err);
    });
  },

  async listLogs({ page = 1, limit = 20, date }) {
    const offset = (page - 1) * limit;
    return await logRepository.listLogs({ limit, offset, date });
  },

  async deleteLogsByDate(date) {
    // Không cho phép xóa ngày hôm nay
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      throw new Error('Không được phép xóa log của ngày hôm nay.');
    }

    const deletedCount = await logRepository.deleteLogsByDate(date);
    return {
      success: true,
      message: `Đã xóa ${deletedCount} logs của ngày ${date}.`
    };
  }
};

module.exports = logService;
