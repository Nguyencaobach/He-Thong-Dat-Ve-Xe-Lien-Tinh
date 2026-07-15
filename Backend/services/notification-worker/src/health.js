/**
 * health.js - Kiểm tra trạng thái notification-worker
 */
function checkHealth() {
  return {
    service:   'notification-worker',
    status:    'ok',
    timestamp: new Date().toISOString(),
  };
}

module.exports = { checkHealth };
