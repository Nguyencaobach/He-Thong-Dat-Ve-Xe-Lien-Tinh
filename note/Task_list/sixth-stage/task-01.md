# Task 01: `ticket-worker` — Kết nối RabbitMQ, lắng nghe hàng đợi `booking.paid`

## 1. Nội dung công việc
Thiết lập `ticket-worker` là một **background worker** (không có HTTP/gRPC port): kết nối RabbitMQ, khai báo queue durable, bind với exchange `booking.events` và routing key `booking.paid`, bắt đầu consume messages.

## 2. Ý nghĩa thực hiện của Task này
- **Worker không có port:** Khác với các service gRPC, ticket-worker và notification-worker là các process chạy nền thuần túy — chỉ kết nối RabbitMQ và xử lý message, không expose HTTP/gRPC.
- **Durable queue:** Queue `ticket.booking_paid` được khai báo `durable: true` để messages không bị mất khi RabbitMQ restart (khớp với `persistent: true` khi publish từ booking-service).
- **prefetch(1):** Chỉ xử lý 1 message tại một lúc, tránh quá tải khi nhiều bookings được paid đồng thời.
- **ACK/NACK:** Chỉ ACK khi sinh vé và publish ticket.issued thành công hoàn toàn. Nếu lỗi → NACK + requeue để retry.
- **Retry kết nối:** Retry 10 lần mỗi 3 giây khi RabbitMQ chưa sẵn sàng (quan trọng khi dev: service boot trước RabbitMQ).

## 3. Các file được tạo/chỉnh sửa
- `ticket-worker/.env` — Cấu hình RABBITMQ_URL, tên exchange/queue, thư mục output vé
- `ticket-worker/src/bookingPaidConsumer.js` — Consumer: connect, assertQueue, bind, consume
- `ticket-worker/src/server.js` — Entry point: khởi tạo publisher + consumer

## 4. Câu lệnh cần chạy
```bash
# Từ thư mục Backend
npm run dev --workspace=ticket-worker

# Hoặc cùng với tất cả service:
npm run kill && npm run dev
```

Khi sẵn sàng, log xuất hiện:
```
[ticket-worker] ✓ Lắng nghe "booking.paid" từ exchange "booking.events" queue "ticket.booking_paid"
[ticket-worker] ✓ Khởi động hoàn tất! Đang chờ sự kiện booking.paid...
```
