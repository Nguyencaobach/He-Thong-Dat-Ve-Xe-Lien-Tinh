require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const kafkaConsumer = require('./kafkaConsumer');
const handlers = require('./analyticsGrpcHandlers');

const PROTO_PATH = path.join(__dirname, '../../../protos/analytics.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const analyticsProto = protoDescriptor.analytics;

const server = new grpc.Server();
server.addService(analyticsProto.AnalyticsService.service, {
  GetDashboardStats: handlers.GetDashboardStats,
});

const PORT = process.env.GRPC_PORT || 50056;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error('[analytics-service] gRPC Bind error:', err);
    return;
  }
  
  // Khởi động Kafka Consumer sau khi gRPC server chạy
  kafkaConsumer.connect().then(() => {
    console.log(`[analytics-service] ✓ Khởi động thành công (gRPC: ${port}, Kafka: Đang nghe)`);
  }).catch(e => {
    console.error('[analytics-service] Lỗi khởi động Kafka:', e);
  });
});
