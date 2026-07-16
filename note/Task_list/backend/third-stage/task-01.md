# Task 01: Khởi tạo kết nối Knex (Postgres) và Redis trong `trip-service`

## 1. Nội dung công việc
Cấu hình đầy đủ file `.env`, `knexfile.js`, `src/db.js` (Knex → PostgreSQL `trip_db`) và `src/tripCache.js` (ioredis → Redis) cho `trip-service`.

## 2. Ý nghĩa thực hiện của Task này
- **Knex thay vì pg thuần:** Knex là query builder cung cấp thêm Migration system (tạo/rollback bảng theo version) và Seed system (chèn dữ liệu mẫu) — không phải chỉ là kết nối DB.
- **Redis cho cache:** Kết quả tìm kiếm chuyến xe được cache với TTL 5 phút, giảm tải DB khi nhiều khách tìm cùng tuyến cùng lúc. Nếu Redis lỗi, service vẫn hoạt động bình thường (không crash).
- **Lazy connect Redis:** `ioredis` với `lazyConnect: true` — không crash ngay khi Redis chưa khởi động, phù hợp cho môi trường Docker.

## 3. Các file được tạo/chỉnh sửa
- `trip-service/.env` — DB, Redis, Kafka config
- `trip-service/knexfile.js` — Cấu hình Knex (client, pool, migration dir, seed dir)
- `trip-service/package.json` — Thêm scripts: `migrate`, `seed`, `rollback`
- `trip-service/src/db.js` — Knex instance + kiểm tra kết nối lúc khởi động
- `trip-service/src/tripCache.js` — Redis cache với `getSearchResult`, `setSearchResult`, `invalidateSearchCache`

## 4. Câu lệnh sử dụng

```bash
# Cài đặt dependencies
cd Backend/services/trip-service
npm install

# Chạy service
npm run dev
```
