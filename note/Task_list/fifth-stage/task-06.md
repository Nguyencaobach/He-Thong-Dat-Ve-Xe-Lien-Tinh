# Task 06: `booking-service` lắng nghe event thanh toán → PAID + chốt ghế

## 1. Nội dung công việc
Viết `paymentEventConsumer.js`: subscribe RabbitMQ queue nhận kết quả thanh toán từ `payment-service`, rồi gọi gRPC `BookSeat` (chốt ghế HELD → BOOKED) và chuyển booking sang `PAID`.

## 2. Ý nghĩa thực hiện của Task này
- **`payment.succeeded`:** Kích hoạt `confirmPaymentSuccess()`:
  1. Gọi gRPC `BookSeat` → seat-service để chốt ghế vĩnh viễn (HELD → BOOKED)
  2. Dùng Knex transaction: cập nhật booking → PAID + ghi outbox event `booking.paid` trong cùng 1 commit
  3. Nếu `BookSeat` thất bại: compensating action → chuyển booking sang CANCELLED và thông báo lỗi
- **`payment.failed`:** Kích hoạt `handlePaymentFailed()`: nhả ghế (`ReleaseSeat`) + chuyển booking → EXPIRED
- **prefetch(1):** Consumer chỉ xử lý 1 message tại một thời điểm để tránh race condition khi cùng 1 booking có 2 event đến gần nhau.
- **ACK/NACK:** Chỉ ACK khi xử lý thành công hoàn toàn. Nếu lỗi → NACK + requeue để thử lại.

## 3. Các file được tạo/chỉnh sửa
- `booking-service/src/paymentEventConsumer.js` — RabbitMQ consumer: subscribe `payment.events` exchange
- `booking-service/src/bookingService.js` — `confirmPaymentSuccess()`, `handlePaymentFailed()`
- `booking-service/src/server.js` — Gọi `startPaymentEventConsumer()` khi boot

## 4. Câu lệnh cần chạy
Consumer tự khởi động cùng `booking-service`. Kiểm tra log:
```
[booking-service] ✓ Lắng nghe payment events từ exchange "payment.events" queue "booking.payment_results"
```
