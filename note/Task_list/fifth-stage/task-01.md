# Task 01: Knex Migrations — Tạo bảng `bookings`, `passengers`, `outbox_events`

## 1. Nội dung công việc
Viết Knex migrations để tạo đầy đủ cấu trúc database cho `booking-service` trên `booking_db` (PostgreSQL). Bao gồm bảng `bookings` (đơn đặt vé), `passengers` (thông tin hành khách), và `outbox_events` (Outbox Pattern).

## 2. Ý nghĩa thực hiện của Task này
- **Bảng `bookings`:** Trái tim của module, lưu trạng thái booking theo state machine. Trường `seat_ids TEXT[]` dùng mảng Postgres native vì mỗi booking có thể đặt nhiều ghế cùng lúc.
- **Bảng `passengers`:** Mỗi ghế trong booking gắn với 1 hành khách (Đặc tả 6.3 điểm 1). Quan hệ N:1 với `bookings` qua `booking_id` (CASCADE DELETE).
- **Bảng `outbox_events`:** Đảm bảo sự kiện `booking.paid` được ghi và publish trong cùng 1 transaction DB — tránh mất event khi service crash sau khi commit DB nhưng trước khi publish RabbitMQ.
- **`knexfile.js`:** Cấu hình kết nối `booking_db` trên port 5433.

## 3. Các file được tạo/chỉnh sửa
- `booking-service/.env` — Cấu hình Postgres, RabbitMQ, Kafka, gRPC
- `booking-service/knexfile.js` — Cấu hình Knex kết nối `booking_db`
- `booking-service/src/db.js` — Module Knex instance dùng chung
- `booking-service/db/migrations/20261010100000_create_bookings_table.js` — Tạo bảng `bookings` + `passengers`
- `booking-service/db/migrations/20261010100001_create_outbox_events.js` — Tạo bảng `outbox_events`
- `booking-service/package.json` — Thêm script `migrate` và `rollback`

## 4. Câu lệnh cần chạy

```bash
# Từ thư mục Backend
cd services/booking-service
npm run migrate   # Tạo bảng bookings, passengers, outbox_events trong booking_db
cd ../..
```
