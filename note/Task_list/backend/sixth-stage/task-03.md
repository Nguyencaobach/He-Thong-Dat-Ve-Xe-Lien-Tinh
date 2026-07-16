# Task 03: Phát event `ticket.issued` lên RabbitMQ sau khi sinh vé

## 1. Nội dung công việc
Sau khi `ticketGenerator.generateTickets()` trả về danh sách vé đã sinh, publish event `ticket.issued` lên RabbitMQ exchange `ticket.events` để `notification-worker` nhận và gửi email.

## 2. Ý nghĩa thực hiện của Task này
- **Tiếp nối chuỗi Saga (Đặc tả 6.4):** `booking.paid → [ticket-worker] sinh vé → ticket.issued → [notification-worker] gửi email`. Mỗi bước chỉ làm đúng 1 việc, giao tiếp qua event.
- **`rabbitmqPublisher.js` của ticket-worker:** Tách riêng publisher (exchange `ticket.events`) khỏi consumer (exchange `booking.events`). Hai exchange độc lập, dễ mở rộng sau này (thêm worker khác cũng subscribe `ticket.events`).
- **Payload `ticket.issued`:** Chứa đầy đủ `{ bookingId, userId, tripId, paidAt, tickets[] }` trong đó `tickets[]` chứa path file HTML, QR code, email hành khách — để `notification-worker` dùng ngay mà không cần query thêm.
- **Xử lý lỗi:** Nếu publish `ticket.issued` thất bại (RabbitMQ vừa disconnect) → NACK message `booking.paid` → booking-service retry sau → tránh mất event.

## 3. Các file được tạo/chỉnh sửa
- `ticket-worker/src/rabbitmqPublisher.js` — Publish lên exchange `ticket.events`, routing key `ticket.issued`
- `ticket-worker/src/bookingPaidConsumer.js` — Sau `generateTickets()` thành công, gọi `rabbitmqPublisher.publish('ticket.issued', {...})`

## 4. Câu lệnh cần chạy
Khi ticket.issued được publish, log xuất hiện:
```
[ticket-worker] ✓ Hoàn thành: 2 vé cho booking a1b2c3d4...
[ticket-worker] RabbitMQ PUBLISH: ticket.events/ticket.issued
```
