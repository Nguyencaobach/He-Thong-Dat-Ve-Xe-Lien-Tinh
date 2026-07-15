# Task 02: Viết gRPC Server lắng nghe lệnh Giữ ghế / Lấy sơ đồ ghế

## 1. Nội dung công việc
Viết `seatGrpcHandlers.js` định nghĩa các RPC handlers theo `seat.proto`, và `server.js` để khởi chạy gRPC Server trên port 50052.

## 2. Ý nghĩa thực hiện của Task này
- **`seatGrpcHandlers.js`:** Ánh xạ 3 RPC method từ `seat.proto` sang `seatService`:
  - `GetSeatMap`: Trả về sơ đồ ghế với trạng thái real-time từ Redis
  - `HoldSeat`: Nhận lệnh giữ ghế từ Gateway, gọi seatService.holdSeat (atomic SETNX)
  - `BookSeat`: Chốt ghế vĩnh viễn sau thanh toán, đọc bookingId/userId từ gRPC metadata
- **`server.js`:** Ngoài việc khởi động gRPC Server, còn thực hiện:
  - Bật Redis Keyspace Notifications (`CONFIG SET notify-keyspace-events Ex`) — cần thiết để nhận thông báo khi TTL hết hạn
  - Subscribe vào channel `__keyevent@0__:expired` để bắt sự kiện ghế tự nhả
  - Khởi động kết nối RabbitMQ (optional, không làm crash nếu lỗi)

## 3. Các file được tạo/chỉnh sửa
- `seat-service/src/seatGrpcHandlers.js` — 4 handlers: GetSeatMap, HoldSeat, BookSeat, ReleaseSeat
- `seat-service/src/server.js` — Khởi động gRPC Server port 50052, Redis keyspace, RabbitMQ

## 4. Câu lệnh cần chạy

```bash
# Kiểm tra seat-service đang lắng nghe trên đúng port
npm run dev --workspace=seat-service
# → Mong đợi: [seat-service] ✓ gRPC server listening on 0.0.0.0:50052
```
