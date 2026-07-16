# Task 02: Viết `db.js` để kết nối vào Database `users_db` của Gateway

## 1. Nội dung công việc
Viết file `db.js` trong `api-gateway/src/` sử dụng thư viện `pg` (node-postgres) để tạo Pool kết nối đến PostgreSQL database `users_db`.

## 2. Ý nghĩa thực hiện của Task này
- **Connection Pool:** Thay vì mở-đóng kết nối mới cho mỗi truy vấn (chậm, tốn tài nguyên), Pool giữ sẵn một nhóm kết nối tái sử dụng. Ứng dụng chỉ cần `pool.query(...)` mà không cần lo kết nối.
- **Test kết nối sớm:** Hàm `pool.connect()` chạy ngay khi server khởi động — nếu DB chưa sẵn sàng, lỗi xuất hiện ngay từ đầu thay vì lúc có request thật.
- **Tách biệt config:** Thông tin DB (host, port, user, password) lấy từ `.env`, không hardcode vào code.

## 3. Các file được tạo/chỉnh sửa
- `api-gateway/src/db.js` — Pool kết nối PostgreSQL với tối đa 10 connections

## 4. Câu lệnh để kiểm tra kết nối

```bash
# Đảm bảo Docker đang chạy với users_db đã tồn tại
docker ps

# Chạy server — nếu thấy log "[DB] Đã kết nối thành công" là OK
node src/server.js
```
