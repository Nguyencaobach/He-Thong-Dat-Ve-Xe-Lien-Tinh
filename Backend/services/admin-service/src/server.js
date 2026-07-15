/**
 * server.js - gRPC Server chính của admin-service (port 50055)
 *
 * TASK-03: Phân quyền ADMIN/STAFF được kiểm tra ở api-gateway (tầng GraphQL).
 * Admin-service không tự kiểm tra token — dựa vào gateway làm barrier.
 * Trong production: có thể thêm gRPC metadata interceptor để double-check role.
 */
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
require('dotenv').config();

const { createAdminGrpcHandlers } = require('./adminGrpcHandlers');
const rabbitmqPublisher = require('./rabbitmqPublisher');
const db = require('./db');

const GRPC_PORT  = process.env.GRPC_PORT || '50055';
const GRPC_HOST  = process.env.GRPC_HOST || '0.0.0.0';
const PROTO_PATH = path.resolve(__dirname, '../../../protos/admin.proto');

function loadAdminProto() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition);
  if (proto.admin?.AdminService) return proto.admin.AdminService;
  if (proto.AdminService)        return proto.AdminService;
  throw new Error('Không tìm thấy AdminService trong admin.proto.');
}

async function startGrpcServer() {
  const AdminService = loadAdminProto();
  const server = new grpc.Server();
  server.addService(AdminService.service, createAdminGrpcHandlers());

  const address = `${GRPC_HOST}:${GRPC_PORT}`;
  await new Promise((resolve, reject) => {
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) return reject(err);
      console.log(`[admin-service] ✓ gRPC server listening on ${address} (port ${port})`);
      resolve();
    });
  });
  return server;
}

async function start() {
  try {
    console.log('[admin-service] Đang khởi động...');

    await rabbitmqPublisher.connect().catch((err) => {
      console.warn('[admin-service] Bỏ qua RabbitMQ:', err.message);
    });

    const grpcServer = await startGrpcServer();
    console.log('[admin-service] ✓ Khởi động hoàn tất!');

    const shutdown = async (signal) => {
      console.log(`[admin-service] Nhận ${signal}...`);
      grpcServer.tryShutdown(async () => {
        await rabbitmqPublisher.close();
        await db.destroy();
        process.exit(0);
      });
    };
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[admin-service] Lỗi khởi động:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

start();
