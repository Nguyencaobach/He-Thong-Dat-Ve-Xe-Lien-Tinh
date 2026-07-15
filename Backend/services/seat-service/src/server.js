/**
 * server.js - gRPC Server chính của seat-service
 *
 * seat-service khác biệt với các service khác:
 * - Không có Postgres, không có Knex — chỉ dùng Redis
 * - Không có outboxWorker — publish trực tiếp qua Redis Pub/Sub
 * - Phải enable Redis Keyspace Notifications để lắng nghe TTL expired
 *
 * Port: 50052 (theo grpcClients.js của api-gateway)
 *
 * Khởi động song song:
 * 1. Kết nối Redis (main + subscriber)
 * 2. Enable keyspace notifications để lắng nghe TTL hết hạn
 * 3. Kết nối RabbitMQ (optional - cho Giai đoạn 5+)
 * 4. Khởi động gRPC Server lắng nghe trên port 50052
 */

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
require('dotenv').config();

const { createSeatGrpcHandlers } = require('./seatGrpcHandlers');
const { redis, redisSub }        = require('./redisClient');
const { redisPubSub }            = require('./redisPubSub');
const rabbitmqPublisher           = require('./rabbitmqPublisher');

const GRPC_PORT  = process.env.GRPC_PORT  || '50052';
const GRPC_HOST  = process.env.GRPC_HOST  || '0.0.0.0';
const PROTO_PATH = path.resolve(__dirname, '../../../protos/seat.proto');

// Tên channel keyspace notification cho db 0
// Format: __keyevent@{db}__:expired
const KEYSPACE_EXPIRED_CHANNEL = '__keyevent@0__:expired';
const SEAT_EVENTS_CHANNEL      = process.env.SEAT_EVENTS_CHANNEL || 'seat_status_updates';

// ── Load proto ────────────────────────────────────────────────────────────────
function loadSeatProto() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const proto = grpc.loadPackageDefinition(packageDefinition);

  if (proto.seat?.SeatService) return proto.seat.SeatService;
  if (proto.SeatService) return proto.SeatService;
  throw new Error('Không tìm thấy SeatService trong seat.proto. Kiểm tra package name.');
}

// ── Enable Redis Keyspace Notifications ──────────────────────────────────────
// Để Redis tự động thông báo khi một key bị xóa do hết TTL,
// ta phải bật tính năng này qua lệnh CONFIG SET
//
// "Ex" = Keyspace events cho expired events
// Sau khi bật, khi key "hold:{tripId}:{seatId}" hết TTL,
// Redis sẽ publish vào channel "__keyevent@0__:expired" với message = tên key đó
async function enableKeyspaceNotifications() {
  try {
    await redis.config('SET', 'notify-keyspace-events', 'Ex');
    console.log('[seat-service] ✓ Redis Keyspace Notifications đã được bật (Ex - expired events)');
  } catch (err) {
    console.warn('[seat-service] ✗ Không thể bật Keyspace Notifications:', err.message);
    console.warn('[seat-service]   Ghế hết TTL sẽ không được tự động thông báo real-time.');
  }
}

// ── Lắng nghe Redis Keyspace Expired Events ──────────────────────────────────
// Khi một hold key hết TTL, Redis notify qua channel __keyevent@0__:expired
// Ta lắng nghe để publish sự kiện "ghế về AVAILABLE" ra cho Frontend
async function subscribeKeyspaceExpiredEvents() {
  await redisSub.subscribe(KEYSPACE_EXPIRED_CHANNEL);

  redisSub.on('message', async (channel, expiredKey) => {
    if (channel !== KEYSPACE_EXPIRED_CHANNEL) return;

    // Chỉ xử lý các key có format: hold:{tripId}:{seatId}
    if (!expiredKey.startsWith('hold:')) return;

    // Parse tripId và seatId từ key
    // Key format: hold:{tripId}:{seatId} — nhưng tripId cũng có thể chứa dấu _
    // Ví dụ: hold:trip123:trip123_A01
    const withoutPrefix = expiredKey.substring('hold:'.length); // "trip123:trip123_A01"
    const colonIdx = withoutPrefix.indexOf(':');
    if (colonIdx === -1) return;

    const tripId  = withoutPrefix.substring(0, colonIdx);
    const seatId  = withoutPrefix.substring(colonIdx + 1);
    const seatNumber = seatId.includes(`${tripId}_`)
      ? seatId.replace(`${tripId}_`, '')
      : seatId;

    console.log(`[seat-service] TTL EXPIRED: ${expiredKey} → ghế ${seatNumber} về AVAILABLE`);

    // Publish sự kiện "ghế đã được giải phóng" để Frontend cập nhật real-time
    await redisPubSub.publishSeatStatusChange(tripId, seatId, seatNumber, 'AVAILABLE');

    // Publish thêm lên RabbitMQ để booking-service biết booking đó cần EXPIRED
    await rabbitmqPublisher.publish('seat.expired', {
      tripId,
      seatId,
      seatNumber,
      expiredAt: new Date().toISOString(),
    }).catch(() => {}); // Không để RabbitMQ lỗi làm crash
  });

  console.log(`[seat-service] ✓ Đang lắng nghe Redis TTL expired events (${KEYSPACE_EXPIRED_CHANNEL})`);
}

// ── Khởi động gRPC Server ────────────────────────────────────────────────────
async function startGrpcServer() {
  const SeatService = loadSeatProto();
  const server = new grpc.Server();

  server.addService(SeatService.service, createSeatGrpcHandlers());

  const address = `${GRPC_HOST}:${GRPC_PORT}`;

  await new Promise((resolve, reject) => {
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) return reject(err);
      console.log(`[seat-service] ✓ gRPC server listening on ${address} (port ${port})`);
      resolve();
    });
  });

  return server;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('[seat-service] Đang khởi động...');

    // 1. Kết nối Redis (lazy — tự kết nối khi dùng lần đầu)
    await redis.connect().catch(() => {}); // ioredis với lazyConnect: true — không throw
    await redisSub.connect().catch(() => {});

    // 2. Enable keyspace notifications (để nhận sự kiện TTL hết hạn)
    await enableKeyspaceNotifications();

    // 3. Subscribe vào keyspace expired events
    await subscribeKeyspaceExpiredEvents();

    // 4. Kết nối RabbitMQ (optional — không làm crash nếu lỗi)
    await rabbitmqPublisher.connect().catch((err) => {
      console.warn('[seat-service] Bỏ qua RabbitMQ:', err.message);
    });

    // 5. Khởi động gRPC Server
    const grpcServer = await startGrpcServer();

    console.log('[seat-service] ✓ Khởi động hoàn tất!');

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`[seat-service] Nhận ${signal}, đang dừng...`);
      grpcServer.tryShutdown(async (err) => {
        if (err) {
          console.error('[seat-service] gRPC shutdown error:', err);
          grpcServer.forceShutdown();
        }
        await rabbitmqPublisher.close();
        await redis.quit();
        await redisSub.quit();
        console.log('[seat-service] Đã đóng tất cả kết nối.');
        process.exit(0);
      });
    };

    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[seat-service] Lỗi khởi động:', error);
    process.exit(1);
  }
}

start();
