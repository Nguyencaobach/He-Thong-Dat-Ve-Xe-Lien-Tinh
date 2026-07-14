# Task 06: Cấu hình Script khởi tạo CSDL tự động

## 1. Nội dung công việc
Kiểm tra file `00_create_databases.sh` nằm trong thư mục `infrastructure/init-db/`. Reset lại container Postgres để ép nó chạy file script này.

## 2. Ý nghĩa thực hiện của Task này
- **Tự động hóa hoàn toàn:** Thay vì phải tải phần mềm DBeaver về rồi gõ tay lệnh `CREATE DATABASE trip_db` lặp đi lặp lại 6 lần, mình "nhét" cái file lệnh này vào container. Ngay khoảnh khắc Postgres vừa bật lên, nó sẽ tự quét và tạo sẵn 6 cái CSDL rỗng chờ mình.
- **Cách ly môi trường:** File script này đảm bảo rằng code của mình dù có mang sang máy thầy cô chấm điểm thì nó cũng tự động dựng đủ 6 CSDL mà không cần ai phải config bằng tay.

# Câu lệnh sử dụng để chạy

Do ở Task 01 anh em mình đã lỡ chạy `docker-compose up -d` TRƯỚC KHI tạo file script, nên Postgres lúc đó nó tưởng không có lệnh gì và đã bỏ qua.
Giờ anh mở Terminal ở thư mục `Backend` và chạy 2 lệnh sau để "đập đi xây lại" Postgres (yên tâm là chưa có dữ liệu gì nên đập rất nhanh):

```bash
docker-compose down -v
docker-compose up -d
```

*(Giải thích lệnh: Lệnh `-v` cực kỳ quan trọng, nó sẽ xóa sạch ổ cứng lưu trữ cũ (Volume) của Docker, ép thằng Postgres phải dọn dẹp lại từ đầu và cắn cái script mồi của mình).*
