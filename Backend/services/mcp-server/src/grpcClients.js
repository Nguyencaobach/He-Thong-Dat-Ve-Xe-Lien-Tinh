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

const AnalyticsService = loadProto('analytics.proto', 'analytics', 'AnalyticsService');
const TripService      = loadProto('trip.proto',      'trip',      'TripService');

const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL || 'localhost:50056';
const TRIP_URL      = process.env.TRIP_SERVICE_URL      || 'localhost:50051';

const analyticsClient = promisifyClient(new AnalyticsService(ANALYTICS_URL, grpc.credentials.createInsecure()));
const tripClient      = promisifyClient(new TripService(TRIP_URL,           grpc.credentials.createInsecure()));

module.exports = { analyticsClient, tripClient };
