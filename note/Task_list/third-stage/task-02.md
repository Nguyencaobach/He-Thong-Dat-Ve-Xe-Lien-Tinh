# Task 02: Viết Knex Migrations tạo bảng `routes` và `trips`

## 1. Nội dung công việc
Viết 3 file migration trong `db/migrations/` để Knex tạo cấu trúc bảng trong `trip_db`.

## 2. Ý nghĩa thực hiện của Task này
- **Migration = Version control cho DB:** Mỗi file migration là một "bước thay đổi" có thể rollback. Thay vì chạy SQL thủ công, Knex theo dõi migration nào đã chạy (bảng `knex_migrations`) để tránh chạy trùng lặp.
- **Tách routes / trips:** Theo đặc tả, `routes` là lộ trình cố định (TP.HCM → Đà Lạt), `trips` là chuyến cụ thể (ngày giờ, xe, giá). Tách bảng tránh lặp dữ liệu khi cùng tuyến có nhiều chuyến/ngày.
- **Index tìm kiếm:** Các cột `departure_province`, `arrival_province`, `departure_time` được đánh index để query tìm chuyến nhanh.

## 3. Các file được tạo/chỉnh sửa
- `db/migrations/20261010000000_create_routes_table.js` — Bảng routes: id, name, departure_province, arrival_province, departure_station, arrival_station, distance_km, duration_minutes, is_active
- `db/migrations/20261010000001_create_trips_table.js` — Bảng trips: id, route_id (FK), bus_id, bus_type, departure_time, arrival_time, base_price, total_seats, available_seats, status
- `db/migrations/20261010000002_create_outbox_events.js` — Bảng outbox_events cho Outbox Pattern

## 4. Câu lệnh sử dụng

```bash
# Tạo tất cả bảng (chạy từ thư mục trip-service)
npm run migrate

# Nếu muốn rollback lần cuối
npm run rollback
```
