/**
 * server.js - Điểm khởi chạy Apollo GraphQL Server
 *
 * Đây là nơi lắp ghép tất cả các mảnh lại với nhau:
 * 1. Schema (TypeDefs) + Resolvers → Apollo Server
 * 2. JWT Middleware (Task-06) → Gắn user vào GraphQL Context
 * 3. Kết nối DB (db.js) được khởi động ngầm khi import
 * 4. gRPC Clients (grpcClients.js) được khởi động ngầm khi import
 *
 * Luồng xử lý một request:
 * Frontend → HTTP POST /graphql → JWT Middleware → Apollo Server → Resolver → gRPC → Service
 */

require('dotenv').config();
const http = require('http');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const express = require('express');
const { json } = require('body-parser');
const jwt = require('jsonwebtoken');

const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const PORT = process.env.PORT || 4000;

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // ── Khởi tạo Apollo Server ──────────────────────────────────────────────
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      // Plugin giúp server đóng kết nối gracefully khi tắt (tránh mất request)
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
    // Bật introspection để dùng Apollo Sandbox / GraphQL Playground trong dev
    introspection: true,
  });

  await server.start();

  // ── Task-06: JWT Middleware → Gắn context cho mỗi request ───────────────
  // Mỗi request GraphQL đến server sẽ chạy qua hàm này.
  // Hàm sẽ cố giải mã JWT token trong header Authorization:
  //   - Nếu token hợp lệ → gắn thông tin user vào context
  //   - Nếu không có token hoặc token hết hạn → context.user = null
  //     (không throw lỗi ở đây — để Resolver tự kiểm tra quyền khi cần)
  app.use(
    '/graphql',
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        let user = null;

        const authHeader = req.headers.authorization || '';
        // Header chuẩn: "Bearer <token>"
        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            // Giải mã token → lấy payload { userId, email, role }
            user = jwt.verify(token, process.env.JWT_SECRET);
          } catch (err) {
            // Token hết hạn hoặc không hợp lệ → user = null (guest)
            console.warn('[Auth] Token không hợp lệ:', err.message);
          }
        }

        // context sẽ được truyền vào mọi Resolver dưới dạng tham số thứ 3
        return { user };
      },
    })
  );

  // ── Khởi động server ────────────────────────────────────────────────────
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

  console.log(`[api-gateway] HTTP GraphQL ready   → http://localhost:${PORT}/graphql`);
  console.log(`[api-gateway] Subscriptions ready  → ws://localhost:${PORT}/graphql`);
}

// Bắt lỗi không mong đợi để không làm crash server im lặng
startServer().catch((err) => {
  console.error('[Server] Lỗi khởi động server:', err);
  process.exit(1);
});
