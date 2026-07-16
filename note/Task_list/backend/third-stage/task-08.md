# Task 08: Outbox Pattern — Lưu log tìm kiếm vào `outbox_events`

## 1. Nội dung công việc
Viết `outboxEventRepository.js` để lưu mỗi lượt tìm kiếm vào bảng `outbox_events` trong cùng database, phục vụ cho việc đẩy analytics lên Kafka sau.

## 2. Ý nghĩa thực hiện của Task này
- **Vấn đề:** Nếu ghi event trực tiếp lên Kafka ngay khi khách tìm kiếm, và Kafka bị down lúc đó → event mất, analytics thiếu dữ liệu.
- **Giải pháp Outbox Pattern:** Lưu event vào DB (cùng database với business data, đảm bảo atomic). Worker poll DB sau và đẩy lên Kafka. Nếu Kafka down → retry sau, không mất event.
- **Không blocking response:** Trong `tripService.js`, lệnh `saveSearchEvent()` được gọi **không có await** → không làm chậm response trả về cho khách, lỗi lưu outbox cũng không ảnh hưởng kết quả tìm kiếm.
- **Trạng thái event:** `pending → publishing → published / failed` — Worker dùng `FOR UPDATE SKIP LOCKED` để tránh 2 worker xử lý cùng 1 row.

## 3. Các file được tạo/chỉnh sửa
- `src/outboxEventRepository.js` — `saveSearchEvent()`, `reservePendingEvents()`, `markPublished()`, `markFailed()`, `resetStuckEvents()`
- `db/migrations/20261010000002_create_outbox_events.js` — Schema bảng outbox_events

## 4. Câu lệnh kiểm tra

```bash
# Kiểm tra outbox sau khi tìm kiếm 1 lần:
docker exec bus_postgres psql -U admin -d trip_db -c \
  "SELECT id, event_type, status, attempts FROM outbox_events ORDER BY created_at DESC LIMIT 5;"
```
