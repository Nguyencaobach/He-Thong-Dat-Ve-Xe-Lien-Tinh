# Task 01: Khởi chạy file `docker-compose.yml` để dựng Postgres, Redis, RabbitMQ, Kafka.

## 1. Nội dung công việc
Khởi chạy file `docker-compose.yml` để dựng lên các phần mềm nền tảng: Postgres, Redis, RabbitMQ và Kafka.

## 2. Ý nghĩa thực hiện của Task này
Task này đóng vai trò như việc "thuê mặt bằng và kéo điện nước" cho toàn bộ hệ thống Microservices trước khi bắt tay vào xây dựng các phòng ban:

- **Chỉ tạo không gian rỗng, CHƯA tạo Bảng (Tables):** Việc chạy Docker ở bước này chỉ đơn thuần cài đặt phần mềm. Dù Postgres có chạy lên thì bên trong nó vẫn hoàn toàn trống không (chưa có bảng Users, bảng Trips...). Các bảng này sẽ do chính tay anh tạo ra bằng code (Knex Migrations) ở các task sau.
- **Tự động hóa chia Database:** Thay vì phải mở giao diện lên tạo bằng tay, hệ thống sẽ tự động đọc file `00_create_databases.sh` mà chúng ta đã chuẩn bị để chia sẵn thành 6 CSDL trống (`trip_db`, `booking_db`, `admin_db`...).
- **Chuẩn bị Message Brokers:** RabbitMQ (Bưu điện) và Kafka (Đài phát thanh) được khởi động sẵn sàng. Nếu không có 2 thành phần này, lát nữa code của `booking-service` và `payment-service` sẽ không thể nói chuyện được với nhau.
- **Chuẩn bị Kho In-memory:** Redis được bật lên để sẵn sàng cho nghiệp vụ "giữ chỗ siêu tốc" (chặn 2 người mua cùng 1 ghế).

# Câu lệnh sử dụng để chạy

- docker-compose up -d

