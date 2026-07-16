# Task 09: Outbox Pattern — Cronjob `outboxWorker.js` đẩy event lên Kafka

## 1. Nội dung công việc
Viết `outboxWorker.js` và `kafkaPublisher.js`: Worker poll bảng `outbox_events` mỗi 2 giây và đẩy event lên Kafka topic `search-events`.

## 2. Ý nghĩa thực hiện của Task này
- **Tại sao Kafka cho search-events:** Theo đặc tả, `search-events` là luồng dữ liệu dạng "stream sự kiện để nhiều consumer phân tích" (khác với RabbitMQ dùng cho booking.paid). Kafka phù hợp vì có thể replay lại toàn bộ lịch sử tìm kiếm, nhiều consumer đọc song song.
- **Polling với batch:** Worker lấy tối đa 20 event mỗi lần poll, xử lý tuần tự. `FOR UPDATE SKIP LOCKED` đảm bảo nếu chạy nhiều worker instance, mỗi row chỉ được 1 worker xử lý.
- **Retry tự động:** Nếu publish Kafka thất bại → đánh dấu `pending` lại + tăng `attempts`. Sau 5 lần thất bại → `failed` (cần can thiệp thủ công).
- **Reset stuck events:** Khi worker khởi động, reset các event stuck ở `publishing` (do crash lần trước) về `pending`.

## 3. Các file được tạo/chỉnh sửa
- `src/kafkaPublisher.js` — Kết nối Kafka Producer, `publish(topic, event)`
- `src/outboxWorker.js` — Polling loop, xử lý batch, graceful shutdown

## 4. Câu lệnh sử dụng

```bash
# Chạy worker riêng (có thể tách process)
node src/outboxWorker.js

# Kiểm tra Kafka nhận được event (dùng Kafka UI hoặc console consumer):
# Xem topic search-events tại http://localhost:9092 (nếu có Kafka UI)

# Biến môi trường quan trọng trong .env:
# KAFKA_BROKERS=localhost:9092
# TRIP_OUTBOX_POLL_INTERVAL_MS=2000   # Poll mỗi 2 giây
# TRIP_OUTBOX_BATCH_SIZE=20           # Xử lý 20 event/lần
# TRIP_OUTBOX_MAX_ATTEMPTS=5          # Thử tối đa 5 lần
```
