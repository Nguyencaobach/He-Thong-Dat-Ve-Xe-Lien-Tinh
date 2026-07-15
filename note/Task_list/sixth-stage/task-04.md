# Task 04: `notification-worker` — Lắng nghe hàng đợi `ticket.issued`

## 1. Nội dung công việc
Thiết lập `notification-worker` là background worker: kết nối RabbitMQ, subscribe queue `notification.ticket_issued` bind với exchange `ticket.events` routing key `ticket.issued`.

## 2. Ý nghĩa thực hiện của Task này
- **Queue độc lập với ticket-worker:** `notification.ticket_issued` là queue riêng của notification-worker — nếu notification-worker tạm dừng, messages vẫn được giữ trong queue (durable) để xử lý sau khi restart.
- **Tách biệt trách nhiệm:** ticket-worker chỉ sinh vé + publish. notification-worker chỉ gửi email. Nếu cần thêm worker khác (ví dụ: push notification app mobile), chỉ cần tạo queue mới bind cùng `ticket.events/ticket.issued` mà không sửa code hiện tại.
- **Tìm email người nhận:** Quét danh sách `tickets[]` trong payload, lấy email của hành khách đầu tiên có email. Nếu không có email nào (guest checkout không nhập email), vẫn ghi log chi tiết — không crash worker.
- **Cấu trúc giống ticket-worker:** Cùng pattern connect/assertQueue/bind/consume/prefetch/ack/nack. Dễ đọc, dễ maintain.

## 3. Các file được tạo/chỉnh sửa
- `notification-worker/.env` — RABBITMQ_URL, TICKET_EVENTS_EXCHANGE, TICKET_ISSUED_QUEUE, EMAIL_MODE
- `notification-worker/src/ticketIssuedConsumer.js` — Consumer: subscribe ticket.issued, gọi emailSender
- `notification-worker/src/server.js` — Entry point: initTransporter + startTicketIssuedConsumer

## 4. Câu lệnh cần chạy
```bash
npm run dev --workspace=notification-worker
```
Log khi sẵn sàng:
```
[notification-worker] ✓ Email ở chế độ LOG (không gửi thật)
[notification-worker] ✓ Lắng nghe "ticket.issued" từ exchange "ticket.events" queue "notification.ticket_issued"
```
