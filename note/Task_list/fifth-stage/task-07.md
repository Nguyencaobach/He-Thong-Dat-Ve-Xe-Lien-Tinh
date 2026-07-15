# Task 07: Đẩy `booking.paid` vào Outbox → RabbitMQ (ticket-worker) + Kafka (analytics)

## 1. Nội dung công việc
Sau khi booking chuyển sang PAID, ghi event `booking.paid` vào bảng `outbox_events`. `outboxWorker` sẽ publish event này lên 2 đích: RabbitMQ (để ticket-worker sinh vé) và Kafka (để analytics-consumer thống kê).

## 2. Ý nghĩa thực hiện của Task này
- **Hai kênh, hai mục đích khác nhau (Đặc tả 6.4):**
  - **RabbitMQ** `booking.events` → `booking.paid`: ticket-worker consume để sinh vé điện tử. Chỉ 1 worker xử lý mỗi message (work queue), đảm bảo không sinh vé trùng.
  - **Kafka** `booking-events`: analytics-consumer consume để lưu thống kê doanh thu, tỉ lệ booking. Nhiều consumer group cùng đọc được, có thể replay.
- **Atomic write trong transaction:** Event được ghi vào `outbox_events` trong cùng Knex transaction với việc cập nhật `bookings.status = PAID`. Nếu transaction rollback → event cũng không ghi → không bao giờ publish event cho booking chưa thực sự PAID.
- **Payload đầy đủ:** Event chứa `{ bookingId, userId, tripId, seatIds[], totalAmount, transactionId, paymentMethod, paidAt }` để ticket-worker và analytics đủ dữ liệu mà không cần query lại.

## 3. Các file được tạo/chỉnh sửa
- `booking-service/src/outboxWorker.js` — Routing: `booking.paid` → RabbitMQ + Kafka; `booking.cancelled/expired` → RabbitMQ only
- `booking-service/src/kafkaPublisher.js` — Publish `booking-events` topic
- `booking-service/src/rabbitmqPublisher.js` — Publish `booking.events` exchange

## 4. Câu lệnh cần chạy
Không cần lệnh riêng. Khi booking chuyển PAID, log xuất hiện:
```
[outbox-worker] Xử lý 1 event(s)...
[booking-service] RabbitMQ PUBLISH: booking.paid
[booking-service] Kafka PUBLISH: booking-events/booking.paid
```
