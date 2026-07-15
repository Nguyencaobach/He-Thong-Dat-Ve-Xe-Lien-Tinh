# Task 03: Logic tạo Booking mới — HoldSeat → PENDING_PAYMENT

## 1. Nội dung công việc
Viết luồng tạo booking: gọi gRPC `HoldSeat` đến `seat-service` để giữ ghế, nếu thành công thì tạo booking với trạng thái `PENDING_PAYMENT`.

## 2. Ý nghĩa thực hiện của Task này
- **Đặc tả 5.4 — Luồng giữ ghế:** booking-service gọi gRPC `HoldSeat` → seat-service thực hiện `SETNX` atomic trên Redis. Nếu ghế đã bị HELD bởi người khác, trả lỗi ngay.
- **Xử lý nhiều ghế (loop + rollback):** Nếu đặt 3 ghế và ghế thứ 2 thất bại → tự động `ReleaseSeat` cho ghế thứ 1 (rollback pattern). Tránh leak ghế bị giữ mãi.
- **`expires_at`:** Được set = now + TTL (mặc định 300s), đồng bộ với TTL ghế ở Redis. Khi booking hết hạn thanh toán, ghế cũng đã tự động về AVAILABLE.
- **`grpcClients.js`:** Tách riêng module quản lý gRPC clients (seat + payment), promisify về Promise để code async/await gọn.

## 3. Các file được tạo/chỉnh sửa
- `booking-service/src/grpcClients.js` — gRPC clients kết nối seat-service (50052) và payment-service (50054)
- `booking-service/src/bookingService.js` — `createBooking()`: hold seats → tạo booking PENDING_PAYMENT
- `booking-service/src/bookingGrpcHandlers.js` — gRPC handler `CreateBooking`

## 4. Câu lệnh cần chạy

```bash
# Từ thư mục Backend
npm run dev --workspace=booking-service

# Test qua GraphQL (khi api-gateway đã thêm resolver):
# mutation { createBooking(tripId: "...", seatIds: ["A01"]) { bookingId } }
```
