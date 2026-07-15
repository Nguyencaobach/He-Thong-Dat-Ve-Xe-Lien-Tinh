/**
 * server.js - gRPC Server chính của booking-service
 *
 * Khởi động song song:
 * 1. Kết nối PostgreSQL (booking_db) — qua db.js import
 * 2. Kết nối RabbitMQ publisher (publish booking.paid)
 * 3. Kết nối RabbitMQ consumer (nhận payment.succeeded/failed)
 * 4. Kết nối Kafka producer (publish booking-events cho analytics)
 * 5. Khởi động outboxWorker (poll DB và publish pending events)
 * 6. Khởi động gRPC Server trên port 50053
 */
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
require('dotenv').config();

const { createBookingGrpcHandlers }    = require('./bookingGrpcHandlers');
const { startPaymentEventConsumer, stopPaymentEventConsumer } = require('./paymentEventConsumer');
const outboxWorker       = require('./outboxWorker');
const rabbitmqPublisher  = require('./rabbitmqPublisher');
const kafkaPublisher     = require('./kafkaPublisher');
const db                 = require('./db'); // Kết nối DB ngay khi import

const GRPC_PORT  = process.env.GRPC_PORT || '50053';
const GRPC_HOST  = process.env.GRPC_HOST || '0.0.0.0';
const PROTO_PATH = path.resolve(__dirname, '../../../protos/booking.proto');

// ── Load proto ────────────────────────────────────────────────────────────────
function loadBookingProto() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition);
  if (proto.booking?.BookingService) return proto.booking.BookingService;
  if (proto.BookingService) return proto.BookingService;
  throw new Error('Không tìm thấy BookingService trong booking.proto.');
}

// ── Khởi động gRPC Server ─────────────────────────────────────────────────────
async function startGrpcServer() {
  const BookingService = loadBookingProto();
  const server = new grpc.Server();

  server.addService(BookingService.service, createBookingGrpcHandlers());

  const address = `${GRPC_HOST}:${GRPC_PORT}`;
  await new Promise((resolve, reject) => {
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) return reject(err);
      console.log(`[booking-service] ✓ gRPC server listening on ${address} (port ${port})`);
      resolve();
    });
  });

  return server;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('[booking-service] Đang khởi động...');

    // RabbitMQ publisher (publish booking.paid)
    await rabbitmqPublisher.connect().catch((err) => {
      console.warn('[booking-service] Bỏ qua RabbitMQ publisher:', err.message);
    });

    // Kafka producer (analytics)
    await kafkaPublisher.connect().catch((err) => {
      console.warn('[booking-service] Bỏ qua Kafka producer:', err.message);
    });

    // RabbitMQ consumer (nhận payment events)
    await startPaymentEventConsumer().catch((err) => {
      console.warn('[booking-service] Bỏ qua payment consumer:', err.message);
    });

    // Outbox Worker
    outboxWorker.start();

    // gRPC Server
    const grpcServer = await startGrpcServer();

    console.log('[booking-service] ✓ Khởi động hoàn tất!');

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`[booking-service] Nhận ${signal}, đang dừng...`);
      outboxWorker.stop();
      grpcServer.tryShutdown(async (err) => {
        if (err) grpcServer.forceShutdown();
        await stopPaymentEventConsumer();
        await rabbitmqPublisher.close();
        await kafkaPublisher.close();
        await db.destroy();
        process.exit(0);
      });
    };

    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[booking-service] Lỗi khởi động:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

start();
