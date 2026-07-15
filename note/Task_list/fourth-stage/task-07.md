# Task 07: Viết `seatEventsConsumer.js` và tích hợp GraphQL Subscriptions tại api-gateway

## 1. Nội dung công việc
Ở phía `api-gateway`: viết `seatEventsConsumer.js` để lắng nghe Redis Pub/Sub channel `seat_status_updates` và đẩy sự kiện vào GraphQL PubSub nội bộ. Đồng thời cập nhật `server.js` để thêm **WebSocket Server** (`graphql-ws`) cho phép Frontend kết nối Subscription, và cập nhật `resolvers.js` để thêm bộ lọc `withFilter` theo `tripId`.

## 2. Ý nghĩa thực hiện của Task này
- **`seatEventsConsumer.js`:** Đây là "cầu nối" giữa Redis Pub/Sub và GraphQL. Nó subscribe Redis channel, parse JSON message, rồi gọi `pubsub.publish(EVENTS.SEAT_STATUS_UPDATED, payload)` — đẩy sự kiện vào engine GraphQL Subscription.
- **WebSocket bắt buộc:** GraphQL Subscription chỉ hoạt động qua WebSocket (giao thức full-duplex). Thêm `WebSocketServer` + `useServer` từ `graphql-ws` vào `server.js` để cùng port 4000 xử lý cả HTTP POST (Query/Mutation) và WebSocket Upgrade (Subscription).
- **`withFilter` theo tripId:** Không có filter, MỌI client đang subscribe sẽ nhận sự kiện ghế của TẤT CẢ chuyến trong hệ thống — rất lãng phí. `withFilter` giúp mỗi client chỉ nhận đúng sự kiện của tripId họ đang xem.
- **Dependencies mới (package.json):**
  - `graphql-ws`: Thư viện WebSocket Subscription chuẩn cho Apollo Server v4
  - `ws`: Underlying WebSocket server library
  - `cors`: Cho phép Frontend (localhost:3000) kết nối Gateway (localhost:4000)
  - `ioredis`: Redis client cho api-gateway lắng nghe Pub/Sub
  - `@graphql-tools/schema`: `makeExecutableSchema` cần thiết để dùng cùng schema cho cả HTTP và WebSocket

## 3. Các file được tạo/chỉnh sửa
- `api-gateway/src/seatEventsConsumer.js` — Subscribe Redis, đẩy vào GraphQL PubSub
- `api-gateway/src/server.js` — Thêm WebSocket Server + gọi `startSeatEventsConsumer()`
- `api-gateway/src/resolvers.js` — Thêm `withFilter` cho Subscription.seatStatusUpdated
- `api-gateway/package.json` — Thêm: `graphql-ws`, `ws`, `cors`, `ioredis`, `@graphql-tools/schema`
- `api-gateway/.env` — Thêm: `REDIS_HOST`, `REDIS_PORT`, `SEAT_EVENTS_CHANNEL`, `FRONTEND_URL`

## 4. Câu lệnh cần chạy

```bash
# Cài thêm các package mới cho api-gateway
npm install

# Khởi động lại api-gateway
npm run dev --workspace=api-gateway
# → Mong đợi:
#   [api-gateway] ✓ Redis subscriber (seat events) kết nối thành công
#   [api-gateway] ✓ Đã subscribe Redis channel: "seat_status_updates"
#   [api-gateway] HTTP GraphQL ready      → http://localhost:4000/graphql
#   [api-gateway] WebSocket Subscription  → ws://localhost:4000/graphql
```

**Test GraphQL Subscription:**
```graphql
# Mở Apollo Sandbox, kết nối ws://localhost:4000/graphql
subscription {
  seatStatusUpdated(tripId: "1") {
    seatId
    seatNumber
    status
  }
}
# Sau đó gọi holdSeat qua mutation ở tab khác
# → Subscription sẽ nhận ngay: { seatNumber: "A01", status: "HELD" }
```
