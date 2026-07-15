/**
 * server.js - Điểm khởi chạy Apollo GraphQL Server (Updated: Giai đoạn 4)
 *
 * Thay đổi so với Giai đoạn 3:
 * - Thêm WebSocket Server (graphql-ws) để hỗ trợ GraphQL Subscriptions
 * - Thêm useServer từ graphql-ws/lib/use/ws để handle subscription
 * - Thêm ApolloServerPluginDrainHttpServer để drain WS khi shutdown
 * - Gọi startSeatEventsConsumer() để lắng nghe sự kiện ghế từ Redis
 *
 * Luồng xử lý:
 * - HTTP POST /graphql → JWT Middleware → Apollo Server → Resolver → gRPC → Service
 * - WebSocket /graphql → graphql-ws → Subscription Resolver → PubSub → Client
 */

require('dotenv').config();
const http = require('http');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const express = require('express');
const { json } = require('body-parser');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const cors = require('cors');

const typeDefs  = require('./schema');
const resolvers = require('./resolvers');
const { startSeatEventsConsumer, stopSeatEventsConsumer } = require('./seatEventsConsumer');

const PORT = process.env.PORT || 4000;

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // ── Tạo executable schema (cần cho cả Apollo Server và graphql-ws) ─────────
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // ── WebSocket Server cho GraphQL Subscriptions ────────────────────────────
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',  // Cùng path với HTTP GraphQL
  });

  // useServer kết nối graphql-ws với schema → xử lý Subscription
  const serverCleanup = useServer({ schema }, wsServer);

  // ── Khởi tạo Apollo Server ──────────────────────────────────────────────
  const server = new ApolloServer({
    schema,
    plugins: [
      // Plugin drain HTTP connections khi server shutdown
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Plugin drain WebSocket connections khi server shutdown
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    // Bật introspection để dùng Apollo Sandbox / GraphQL Playground trong dev
    introspection: true,
  });

  await server.start();

  // ── CORS middleware ──────────────────────────────────────────────────────
  app.use(cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://studio.apollographql.com',
    ],
    credentials: true,
  }));

  // ── JWT Middleware → Gắn context cho mỗi request ──────────────────────────
  app.use(
    '/graphql',
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        let user = null;

        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            user = jwt.verify(token, process.env.JWT_SECRET);
          } catch (err) {
            console.warn('[Auth] Token không hợp lệ:', err.message);
          }
        }

        return { user };
      },
    })
  );

  // ── Khởi động seat events consumer (Redis Pub/Sub → GraphQL Subscription) ──
  // Phải khởi động sau khi Apollo Server đã start để pubsub sẵn sàng
  await startSeatEventsConsumer().catch((err) => {
    console.warn('[api-gateway] Không thể khởi động seat events consumer:', err.message);
  });

  // ── Khởi động server ────────────────────────────────────────────────────
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`[api-gateway] HTTP GraphQL ready      → http://localhost:${PORT}/graphql`);
  console.log(`[api-gateway] WebSocket Subscription  → ws://localhost:${PORT}/graphql`);
  console.log(`[api-gateway] Apollo Sandbox          → https://studio.apollographql.com/sandbox/explorer`);

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`[api-gateway] Nhận ${signal}, đang dừng...`);
    await stopSeatEventsConsumer();
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[Server] Lỗi khởi động server:', err);
  process.exit(1);
});
