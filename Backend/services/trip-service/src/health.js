/**
 * health.js - HTTP Health check endpoint (tùy chọn)
 * Dùng để kiểm tra service đang sống hay không.
 * GET http://localhost:3001/health
 */
const http = require('http');

function startHealthServer({ serviceName = 'trip-service', port = 3001, db } = {}) {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      let dbStatus = 'ok';
      try {
        await db.raw('SELECT 1');
      } catch {
        dbStatus = 'error';
      }

      const body = JSON.stringify({
        service: serviceName,
        status: dbStatus === 'ok' ? 'ok' : 'degraded',
        db: dbStatus,
        timestamp: new Date().toISOString(),
      });

      res.writeHead(dbStatus === 'ok' ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(body);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`[${serviceName}] Health check → http://localhost:${port}/health`);
  });

  return server;
}

module.exports = { startHealthServer };
