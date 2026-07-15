# Task 03: Tạo bảng `Users` (id, email, password, role)

## 1. Nội dung công việc
Viết SQL vào file `infrastructure/init-db/06_init_gateway_db.sql` để tạo bảng `users` trong `users_db`. Bảng được tạo tự động khi Docker khởi động lần đầu.

## 2. Ý nghĩa thực hiện của Task này
- **Tự động hóa:** Script SQL được Docker Postgres đọc tự động từ `/docker-entrypoint-initdb.d/` khi volume còn trống — ai clone dự án về cũng được tạo bảng tự động mà không cần thao tác thủ công.
- **Thiết kế bảng:** Dùng `UUID` làm Primary Key (an toàn hơn INT vì không đoán được), ENUM cho `role` (đảm bảo chỉ có giá trị hợp lệ ADMIN/STAFF/CUSTOMER), `TIMESTAMPTZ` lưu thời gian kèm timezone.
- **Index email:** `CREATE INDEX idx_users_email` giúp truy vấn `WHERE email = ?` khi đăng nhập nhanh gấp nhiều lần.

## 3. Các file được tạo/chỉnh sửa
- `infrastructure/init-db/06_init_gateway_db.sql` — DDL tạo bảng users

## 4. Câu lệnh để tạo lại bảng từ đầu

```bash
# Xóa volume cũ và khởi động lại Docker (Postgres sẽ chạy lại tất cả script init)
docker-compose down -v
docker-compose up -d

# Kiểm tra bảng đã tạo chưa
docker exec -it bus_postgres psql -U admin -d users_db -c "\d users"
```
