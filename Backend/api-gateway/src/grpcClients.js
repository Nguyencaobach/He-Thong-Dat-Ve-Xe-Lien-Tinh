/**
 * grpcClients.js - Khởi tạo các gRPC Client (theo pattern của Backend-Week06)
 *
 * Điểm khác biệt quan trọng so với callback thuần:
 * - promisifyClient() bọc toàn bộ gRPC method thành Promise
 * - Resolver chỉ cần viết: const result = await clients.trip.SearchTrips({...})
 * - Không cần new Promise((resolve, reject) => { ... }) ở mỗi Resolver
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
require('dotenv').config();

const PROTO_DIR = path.resolve(__dirname, '../../protos');

const PROTO_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// ── Helper: Load file .proto và trả về package ──────────────────────────────
function loadProto(filename, packageName) {
  const protoPath = path.join(PROTO_DIR, filename);
  const packageDefinition = protoLoader.loadSync(protoPath, PROTO_OPTIONS);
  return grpc.loadPackageDefinition(packageDefinition)[packageName];
}

// ── Helper: Bọc gRPC client thành Promise (giống Backend-Week06) ─────────────
// Thay vì: client.SearchTrips(req, (err, res) => { ... })
// Viết được: const res = await clients.trip.SearchTrips(req)
function promisifyClient(client) {
  return new Proxy(client, {
    get(target, prop) {
      const original = target[prop];
      if (typeof original !== 'function') return original;

      return (request, metadata = new grpc.Metadata()) =>
        new Promise((resolve, reject) => {
          original.call(target, request, metadata, (error, response) => {
            if (error) return reject(error);
            resolve(response);
          });
        });
    },
  });
}

// ── Khởi tạo tất cả gRPC clients ────────────────────────────────────────────
const tripProto     = loadProto('trip.proto',    'trip');
const seatProto     = loadProto('seat.proto',    'seat');
const bookingProto  = loadProto('booking.proto', 'booking');
const paymentProto  = loadProto('payment.proto', 'payment');
const adminProto    = loadProto('admin.proto',   'admin');

const clients = {
  trip: promisifyClient(
    new tripProto.TripService(
      process.env.TRIP_SERVICE_URL ?? 'localhost:50051',
      grpc.credentials.createInsecure()
    )
  ),
  seat: promisifyClient(
    new seatProto.SeatService(
      process.env.SEAT_SERVICE_URL ?? 'localhost:50052',
      grpc.credentials.createInsecure()
    )
  ),
  booking: promisifyClient(
    new bookingProto.BookingService(
      process.env.BOOKING_SERVICE_URL ?? 'localhost:50053',
      grpc.credentials.createInsecure()
    )
  ),
  payment: promisifyClient(
    new paymentProto.PaymentService(
      process.env.PAYMENT_SERVICE_URL ?? 'localhost:50054',
      grpc.credentials.createInsecure()
    )
  ),
  admin: promisifyClient(
    new adminProto.AdminService(
      process.env.ADMIN_SERVICE_URL ?? 'localhost:50055',
      grpc.credentials.createInsecure()
    )
  ),
};

console.log('[api-gateway] gRPC clients sẵn sàng: trip:50051, seat:50052, booking:50053, payment:50054, admin:50055');

module.exports = { clients, grpc };
