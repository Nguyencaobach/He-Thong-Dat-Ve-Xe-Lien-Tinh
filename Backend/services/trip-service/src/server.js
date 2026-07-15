/**
 * server.js - gRPC Server chính của trip-service
 *
 * Lắng nghe các request từ API Gateway:
 *   - SearchTrips: Tìm chuyến xe (departure, destination, date)
 *   - GetTripDetails: Chi tiết một chuyến
 *
 * Chạy song song với outboxWorker (được import và chạy cùng process).
 */
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
require('dotenv').config();

const { createTripGrpcHandlers } = require('./tripGrpcHandlers');
const db = require('./db');

const GRPC_PORT = process.env.GRPC_PORT || '50051';
const GRPC_HOST = process.env.GRPC_HOST || '0.0.0.0';
const PROTO_PATH = path.resolve(__dirname, '../../../protos/trip.proto');

// ── Load proto ───────────────────────────────────────────────────────────────
function loadTripProto() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition);

  // Hỗ trợ cả package name "trip" và không có package
  if (proto.trip?.TripService) return proto.trip.TripService;
  if (proto.TripService) return proto.TripService;
  throw new Error('Không tìm thấy TripService trong trip.proto. Kiểm tra package name.');
}

// ── Khởi động gRPC Server ────────────────────────────────────────────────────
async function startGrpcServer() {
  const TripService = loadTripProto();
  const server = new grpc.Server();

  server.addService(TripService.service, createTripGrpcHandlers());

  const address = `${GRPC_HOST}:${GRPC_PORT}`;

  await new Promise((resolve, reject) => {
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) return reject(err);
      console.log(`[trip-service] gRPC server listening on ${address} (port ${port})`);
      resolve();
    });
  });

  return server;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    const grpcServer = await startGrpcServer();

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`[trip-service] Nhận ${signal}, đang dừng...`);
      grpcServer.tryShutdown(async (err) => {
        if (err) {
          console.error('[trip-service] gRPC shutdown error:', err);
          grpcServer.forceShutdown();
        }
        await db.destroy();
        console.log('[trip-service] Đã đóng DB connection');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[trip-service] Không thể khởi động:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

start();

