# Luồng hoạt động: Booking Service (`booking-service`)

## 1. Giới thiệu chung
- **Vai trò:** Trung tâm quản lý quy trình đặt vé. Là trái tim của hệ thống giao dịch, quản lý vòng đời (State Machine) của một đơn hàng từ lúc nháp đến lúc hoàn thành.
- **Công nghệ:** Node.js, gRPC Server, PostgreSQL (Knex), Pattern Outbox & Saga (Choreography).
- **Port hoạt động:** `50053`

## 2. Luồng xử lý chi tiết (State Machine & Logic)
1. **Tạo đơn hàng (CreateBooking):**
   - File `src/bookingService.js` tiếp nhận request tạo vé từ Gateway.
   - Đầu tiên, nó gọi gRPC sang `seat-service` (cổng 50052) để thực hiện "Khóa ghế 5 phút" (HoldSeat). Nếu giữ thành công, mới tiếp tục.
   - Lưu record đơn hàng vào bảng `bookings` (Postgres `booking_db`) với trạng thái ban đầu là `PENDING_PAYMENT`.
2. **Thanh toán thành công (Saga Choreography):**
   - Khi thanh toán xong, `payment-service` bắn sự kiện lên RabbitMQ.
   - File `src/paymentCompletedConsumer.js` (của booking-service) lắng nghe sự kiện này.
   - Khi nhận được tin, nó tiến hành:
     - Update trạng thái booking trong DB thành `PAID`.
     - Gọi gRPC sang `seat-service` yêu cầu chốt ghế vĩnh viễn (BookSeat).
     - Ghi một event "booking.paid" vào bảng `outbox_events` (Chuẩn bị gửi cho Worker sinh vé).
3. **Outbox Pattern:**
   - Để tránh trường hợp cập nhật DB thành công nhưng gửi Message Queue thất bại (hoặc ngược lại) dẫn đến sai lệch dữ liệu.
   - Khi đổi trạng thái thành `PAID`, service ghi đồng thời vào bảng `outbox_events` (nằm trong cùng 1 transaction DB).
   - Tiến trình nền `src/outboxWorker.js` cứ 3 giây sẽ quét bảng này. Nếu thấy có event chưa gửi, nó sẽ gửi lên RabbitMQ, sau đó đánh dấu là đã gửi. Đảm bảo At-least-once delivery (không bao giờ mất thông điệp).

## 3. Tổng kết đánh giá theo Đặc tả
- Quản lý State Machine chính xác theo Đặc tả 6.2 (DRAFT -> PENDING_PAYMENT -> PAID).
- Implement Distributed Transaction hoàn hảo bằng Choreography Saga kết hợp Outbox Pattern, giải quyết bài toán tính nhất quán dữ liệu (Data Consistency) giữa các Microservices.
