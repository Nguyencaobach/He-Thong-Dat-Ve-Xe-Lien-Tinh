const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
require('dotenv').config();

const PROTO_DIR = path.resolve(__dirname, '../../../protos');
const PROTO_OPTIONS = {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
};

function loadProto(filename, packageName, serviceName) {
  const packageDef = protoLoader.loadSync(path.join(PROTO_DIR, filename), PROTO_OPTIONS);
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
          client[method](args, metadata, (err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
        });
    }
  });
  return proxy;
}

const TripService    = loadProto('trip.proto',    'trip',    'TripService');
const BookingService = loadProto('booking.proto', 'booking', 'BookingService');

const TRIP_URL    = process.env.TRIP_SERVICE_URL    || 'localhost:50051';
const BOOKING_URL = process.env.BOOKING_SERVICE_URL || 'localhost:50053';

const tripClient    = promisifyClient(new TripService(TRIP_URL,       grpc.credentials.createInsecure()));
const bookingClient = promisifyClient(new BookingService(BOOKING_URL, grpc.credentials.createInsecure()));

module.exports = { tripClient, bookingClient };
