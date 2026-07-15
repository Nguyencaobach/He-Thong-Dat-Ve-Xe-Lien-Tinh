/**
 * server.js - gRPC Server chính của payment-service (port 50054)
 */
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
require('dotenv').config();

const { createPaymentGrpcHandlers } = require('./paymentGrpcHandlers');
const rabbitmqPublisher = require('./rabbitmqPublisher');
const db = require('./db');

const GRPC_PORT  = process.env.GRPC_PORT || '50054';
const GRPC_HOST  = process.env.GRPC_HOST || '0.0.0.0';
const PROTO_PATH = path.resolve(__dirname, '../../../protos/payment.proto');

function loadPaymentProto() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition);
  if (proto.payment?.PaymentService) return proto.payment.PaymentService;
  if (proto.PaymentService) return proto.PaymentService;
  throw new Error('Không tìm thấy PaymentService trong payment.proto.');
}

async function startGrpcServer() {
  const PaymentService = loadPaymentProto();
  const server = new grpc.Server();
  server.addService(PaymentService.service, createPaymentGrpcHandlers());

  const address = `${GRPC_HOST}:${GRPC_PORT}`;
  await new Promise((resolve, reject) => {
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) return reject(err);
      console.log(`[payment-service] ✓ gRPC server listening on ${address} (port ${port})`);
      resolve();
    });
  });
  return server;
}

async function start() {
  try {
    console.log('[payment-service] Đang khởi động...');

    await rabbitmqPublisher.connect().catch((err) => {
      console.warn('[payment-service] Bỏ qua RabbitMQ:', err.message);
    });

    const grpcServer = await startGrpcServer();
    console.log('[payment-service] ✓ Khởi động hoàn tất!');

    const shutdown = async (signal) => {
      console.log(`[payment-service] Nhận ${signal}...`);
      grpcServer.tryShutdown(async () => {
        await rabbitmqPublisher.close();
        await db.destroy();
        process.exit(0);
      });
    };
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[payment-service] Lỗi khởi động:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

start();
