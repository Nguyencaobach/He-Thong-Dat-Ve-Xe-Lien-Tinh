/**
 * grpcClients.js - gRPC clients của booking-service
 *
 * booking-service cần gọi:
 * - seat-service (HoldSeat, BookSeat, ReleaseSeat)  → port 50052
 * - payment-service (ProcessPayment)                 → port 50054
 */
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
require('dotenv').config();

const PROTO_DIR = path.resolve(__dirname, '../../../protos');

const PROTO_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadProto(filename, packageName, serviceName) {
  const packageDef = protoLoader.loadSync(
    path.join(PROTO_DIR, filename),
    PROTO_OPTIONS
  );
  const proto = grpc.loadPackageDefinition(packageDef);
  const pkg = proto[packageName] || proto;
  return pkg[serviceName];
}

function promisifyClient(client) {
  const proxy = {};
  Object.keys(Object.getPrototypeOf(client)).forEach((method) => {
    if (typeof client[method] === 'function') {
      proxy[method] = (args, metadata = new grpc.Metadata()) =>
        new Promise((resolve, reject) => {
          client[method](args, metadata, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
    }
  });
  return proxy;
}

// ── Khởi tạo clients ─────────────────────────────────────────────────────────
const SeatService    = loadProto('seat.proto',    'seat',    'SeatService');
const PaymentService = loadProto('payment.proto', 'payment', 'PaymentService');
const TripService    = loadProto('trip.proto',    'trip',    'TripService');

const SEAT_URL    = process.env.SEAT_SERVICE_URL    || 'localhost:50052';
const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL || 'localhost:50054';
const TRIP_URL    = process.env.TRIP_SERVICE_URL    || 'localhost:50051';

const seatClient    = new SeatService(SEAT_URL,    grpc.credentials.createInsecure());
const paymentClient = new PaymentService(PAYMENT_URL, grpc.credentials.createInsecure());
const tripClient    = new TripService(TRIP_URL,    grpc.credentials.createInsecure());

const clients = {
  seat:    promisifyClient(seatClient),
  payment: promisifyClient(paymentClient),
  trip:    promisifyClient(tripClient),
};

console.log(`[booking-service] gRPC clients: seat:${SEAT_URL}, payment:${PAYMENT_URL}`);

module.exports = { clients, seatClient };
