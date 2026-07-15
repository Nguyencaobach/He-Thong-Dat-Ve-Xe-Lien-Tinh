# Task 04: Cài đặt gRPC Server lắng nghe Gateway

## 1. Nội dung công việc
Viết `src/server.js` để khởi động gRPC Server, load `trip.proto`, đăng ký các handler và lắng nghe trên port 50051.

## 2. Ý nghĩa thực hiện của Task này
- **gRPC = giao tiếp đồng bộ nội bộ:** API Gateway gọi `TripService.SearchTrips()` và chờ kết quả — đây là giao tiếp đồng bộ vì Gateway cần có danh sách chuyến mới trả về cho Frontend.
- **Proto-first:** `trip.proto` định nghĩa interface trước, cả Gateway (client) và trip-service (server) đều tuân thủ cùng schema — tránh lỗi mismatch dữ liệu.
- **Graceful shutdown:** Khi nhận SIGINT/SIGTERM (Ctrl+C hoặc Docker stop), server đóng kết nối DB và gRPC sạch sẽ, tránh mất dữ liệu đang xử lý.

## 3. Các file được tạo/chỉnh sửa
- `src/server.js` — Load proto, bind gRPC server, graceful shutdown
- `src/tripGrpcHandlers.js` — Xử lý 2 method: `SearchTrips`, `GetTripDetails`

## 4. Câu lệnh sử dụng

```bash
# Khởi động gRPC server (port 50051)
npm run dev

# Kết quả mong đợi trên terminal:
# [trip-service] ✓ Kết nối PostgreSQL (trip_db) thành công
# [trip-service] ✓ Kết nối Redis thành công
# [trip-service] gRPC server listening on 0.0.0.0:50051
```
