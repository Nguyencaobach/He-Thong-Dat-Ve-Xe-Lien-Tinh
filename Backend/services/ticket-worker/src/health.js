/**
 * health.js - Kiểm tra trạng thái ticket-worker
 */
function checkHealth() {
  return {
    service:   'ticket-worker',
    status:    'ok',
    timestamp: new Date().toISOString(),
  };
}

module.exports = { checkHealth };
