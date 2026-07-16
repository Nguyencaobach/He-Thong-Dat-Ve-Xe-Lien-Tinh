# Task 05: Saga/Outbox — Khi thanh toán thành công, ném event lên RabbitMQ

## 1. Nội dung công việc
Tích hợp Outbox Pattern và `outboxWorker.js` vào booking-service để đảm bảo event `booking.paid` được publish đáng tin cậy lên RabbitMQ (cho ticket-worker) và Kafka (cho analytics).

## 2. Ý nghĩa thực hiện của Task này
- **Vì sao cần Outbox Pattern?** Nếu ghi DB thành công nhưng service crash trước khi publish RabbitMQ → event mất vĩnh viễn. Outbox ghi event vào DB trong cùng 1 transaction → Worker poll và publish → Dù crash ở đâu cũng có thể retry.
- **`outboxWorker.js`:** Poll bảng `outbox_events` mỗi 2 giây (configurable), xử lý batch, ghi lại kết quả thành công/thất bại. Tự retry khi thất bại (tối đa `MAX_ATTEMPTS` lần).
- **Routing đa kênh:**
  - `booking.paid` → RabbitMQ exchange `booking.events` (ticket-worker consume) + Kafka topic `booking-events` (analytics-consumer consume)
  - `booking.cancelled` / `booking.expired` → RabbitMQ exchange `booking.events` (notification-worker)
- **Idempotency:** Mỗi event có `id` UUID, nếu worker xử lý trùng (restart) thì `status = published` sẽ skip.

## 3. Các file được tạo/chỉnh sửa
- `booking-service/src/outboxEventRepository.js` — CRUD bảng `outbox_events`: `getPendingEvents()`, `markPublished()`, `markFailed()`
- `booking-service/src/rabbitmqPublisher.js` — Publish lên exchange `booking.events`
- `booking-service/src/kafkaPublisher.js` — Publish lên topic `booking-events`
- `booking-service/src/outboxWorker.js` — Worker poll và xử lý event

## 4. Câu lệnh cần chạy
Không cần chạy riêng — outboxWorker được khởi động trong `server.js` khi service boot.
