# Luồng hoạt động: Payment Service (`payment-service`)

## 1. Giới thiệu chung
- **Vai trò:** Xử lý thanh toán. (Trong mô phỏng dự án, nó giả lập việc gọi API đến VNPAY/Momo/ZaloPay).
- **Công nghệ:** Node.js, gRPC Server, PostgreSQL (Knex), Outbox Pattern.
- **Port hoạt động:** `50054`

## 2. Luồng xử lý chi tiết (Internal Logic)
1. **Tiếp nhận yêu cầu (`ProcessPayment`):**
   - Người dùng bấm "Thanh toán", Gateway gọi RPC xuống.
   - File `src/paymentService.js` tạo một Record giao dịch vào bảng `transactions` (Postgres `payment_db`) với trạng thái `PROCESSING`.
2. **Xử lý giả lập:**
   - Hệ thống cố tình đợi vài giây (giả lập việc kết nối ngân hàng).
   - Nếu tham số gửi xuống là "SUCCESS", giao dịch cập nhật thành công. Nếu "FAIL", giao dịch báo lỗi.
3. **Phát sự kiện (Publish Event):**
   - Tương tự như `booking-service`, `payment-service` không gọi ngược lại `booking-service` bằng gRPC để báo kết quả (tránh Coupling và gây nghẽn cổ chai).
   - Thay vào đó, nó ghi sự kiện "thanh toán thành công" vào bảng `outbox_events` (trong cùng 1 giao dịch DB).
   - `src/outboxWorker.js` của `payment-service` định kỳ quét bảng này và đẩy tin nhắn `payment.completed` lên RabbitMQ (Exchange: `payment.events`).
   - `booking-service` ở phía bên kia sẽ tự động chộp lấy tin nhắn này và xử lý tiếp (xem luồng của Booking Service).

## 3. Tổng kết đánh giá theo Đặc tả
- Hệ thống áp dụng thành thạo mô hình Event-Driven Architecture (EDA).
- Outbox pattern đảm bảo không bao giờ có tình trạng "Tiền trong tài khoản đã trừ mà hệ thống báo chưa thanh toán do rớt mạng lúc gửi Message Queue".
