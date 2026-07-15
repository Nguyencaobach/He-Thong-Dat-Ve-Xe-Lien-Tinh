# Task 02: gRPC Server — CRUD Admin

## 1. Nội dung công việc
Viết gRPC Server cho `admin-service` (port 50055) xử lý đầy đủ các RPC trong `admin.proto`: Bus CRUD, trip management, block seat, check-in, dashboard.

## 2. Ý nghĩa thực hiện của Task này

### Mở rộng `admin.proto`
Proto cũ chỉ có 2 RPC (`GetDashboardStats`, `ManageTrip`). Đã mở rộng thành 11 RPC đầy đủ:
- `CreateBus`, `GetBus`, `ListBuses`, `UpdateBus`, `DeleteBus` — Bus CRUD
- `ManageTrip`, `ListBookingsByTrip` — Quản lý chuyến
- `BlockSeat`, `UnblockSeat` — Khóa/mở ghế
- `CheckIn` — Check-in hành khách
- `GetDashboardStats` — Thống kê

### 3 tầng rõ ràng
- **`adminGrpcHandlers.js`** — Tầng gRPC: nhận request, validate input, map response
- **`adminService.js`** — Tầng nghiệp vụ: logic xử lý, gọi repository/clients
- **`adminRepository.js`** — Tầng DB: Knex queries trực tiếp

### gRPC clients
- `grpcClients.js` kết nối `booking-service:50053` và `seat-service:50052` để admin-service có thể gọi gRPC xác minh booking và khóa ghế.

## 3. Các file được tạo/chỉnh sửa
- `admin-service/protos/admin.proto` — Mở rộng: 11 RPCs + đầy đủ Messages
- `admin-service/src/server.js` — gRPC server port 50055
- `admin-service/src/adminGrpcHandlers.js` — 11 handler functions
- `admin-service/src/adminService.js` — Business logic
- `admin-service/src/adminRepository.js` — DB layer
- `admin-service/src/grpcClients.js` — gRPC client kết nối booking + seat service
- `admin-service/src/db.js` — Knex instance kết nối admin_db

## 4. Câu lệnh cần chạy
```bash
npm run dev --workspace=admin-service
# Hoặc: npm run kill && npm run dev (chạy tất cả)
```
Log khi sẵn sàng:
```
[admin-service] ✓ Kết nối PostgreSQL (admin_db) thành công
[admin-service] ✓ gRPC server listening on 0.0.0.0:50055
```
