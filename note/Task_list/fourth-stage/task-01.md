# Task 01: Khởi tạo kết nối Redis trong `seat-service`

## 1. Nội dung công việc
Cấu hình file `.env` cho `seat-service` và viết module `redisClient.js` — kết nối Redis dùng chung trong toàn service. Đây là bước nền tảng bắt buộc vì `seat-service` dùng **Redis thay cho Postgres** làm kho lưu trữ chính.

## 2. Ý nghĩa thực hiện của Task này
- **Không có Postgres:** Khác với `trip-service` hay `booking-service`, `seat-service` hoàn toàn không cần Postgres vì đặc tả yêu cầu giữ ghế phải phản hồi dưới 1 giây — Redis In-Memory đáp ứng được, Postgres thì không.
- **Hai client riêng biệt:** `redisClient.js` tạo ra hai instance Redis:
  - `redis`: Dùng cho mọi lệnh đọc/ghi thông thường (SETNX, GET, DEL, SET...)
  - `redisSub`: Dùng riêng cho SUBSCRIBE — Redis quy định khi một client đang ở chế độ SUBSCRIBE thì nó không được gọi thêm lệnh nào khác, nên buộc phải có client riêng.
- **lazyConnect:** Cả hai client dùng `lazyConnect: true` để không crash ngay khi Redis chưa sẵn sàng khi service khởi động.

## 3. Các file được tạo/chỉnh sửa
- `seat-service/.env` — Cấu hình Redis host/port, gRPC port, TTL giữ ghế
- `seat-service/src/redisClient.js` — Module xuất 2 client: `{ redis, redisSub }`
- `seat-service/src/health.js` — Hàm kiểm tra kết nối Redis bằng PING

## 4. Câu lệnh cần chạy

```bash
# Cài đặt dependencies từ thư mục Backend (root monorepo)
npm install

# Khởi động seat-service
npm run dev --workspace=seat-service
```
