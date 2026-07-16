# Task 08: Khởi tạo các gRPC Clients (`grpcClients.js`)

## 1. Nội dung công việc
Viết file `grpcClients.js` để API Gateway khởi tạo 5 gRPC clients (trip, seat, booking, payment, admin) ngay khi server start. Mỗi client đọc file `.proto` tương ứng và kết nối đến địa chỉ service qua biến môi trường.

## 2. Ý nghĩa thực hiện của Task này
- **Khởi tạo một lần, dùng nhiều lần:** gRPC client được tạo khi module load, sau đó tái sử dụng cho mọi request. Cơ chế này tương tự Connection Pool của DB — hiệu quả hơn nhiều so với tạo kết nối mới mỗi lần.
- **Đọc file `.proto` động:** Thay vì generate code tĩnh từ proto (protoc), dự án dùng `@grpc/proto-loader` để load file `.proto` tại runtime. Linh hoạt hơn cho môi trường dev.
- **Insecure credentials:** Dùng `grpc.credentials.createInsecure()` cho giao tiếp nội bộ giữa các service (không public internet). Production nên dùng TLS.
- **Địa chỉ từ .env:** Khi deploy với Docker/Kubernetes, chỉ cần thay đổi biến môi trường (`TRIP_SERVICE_URL=trip-service:50051`) mà không cần sửa code.

## 3. Các file được tạo/chỉnh sửa
- `api-gateway/src/grpcClients.js` — 5 gRPC clients

## 4. Thư viện sử dụng

```bash
npm install @grpc/grpc-js @grpc/proto-loader
```

## 5. Địa chỉ các service (từ .env)
| Client | URL mặc định |
|---|---|
| trip | localhost:50051 |
| seat | localhost:50052 |
| booking | localhost:50053 |
| payment | localhost:50054 |
| admin | localhost:50055 |
