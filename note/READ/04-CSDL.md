# Thiết kế Cơ sở dữ liệu (Database-per-Service)

Trong kiến trúc Microservices của dự án này, hệ thống tuân thủ nghiêm ngặt nguyên tắc **"Database-per-Service"** (Mỗi service sở hữu một Database riêng biệt).

## 1. Nguyên tắc cốt lõi
- **Độc lập dữ liệu:** `trip-service` chỉ được phép đọc/ghi vào `trip_db`. Nó không hề biết sự tồn tại của `booking_db`.
- **Giao tiếp qua gRPC:** Nếu `booking-service` muốn biết giá tiền của chuyến xe, nó **TUYỆT ĐỐI KHÔNG ĐƯỢC** truy cập thẳng vào `trip_db` để SELECT. Thay vào đó, nó phải gọi API nội bộ qua gRPC.
- **Tính chịu lỗi cao:** Giả sử lượng người thanh toán quá đông làm sập `booking_db`, thì `trip_db` vẫn hoạt động bình thường, khách mới vẫn có thể tra cứu lịch trình chuyến xe mà không bị ảnh hưởng.

## 2. Danh sách các Bảng nghiệp vụ phân bổ theo Service

Hệ thống bao gồm khoảng 10 bảng nghiệp vụ lõi, chia ra cho 5 Database PostgreSQL riêng biệt và 1 kho Redis.

### Database 1: `users_db` (Thuộc `api-gateway`)
- **`users`**: Bảng quản lý tài khoản đăng nhập. Lưu các thông tin: `id`, `email`, `password_hash`, `role` (ADMIN, STAFF, CUSTOMER), họ tên, số điện thoại.

### Database 2: `trip_db` (Thuộc `trip-service`)
- **`routes`** (Tuyến xe): Lưu thông tin lộ trình cố định (VD: Sài Gòn - Đà Lạt), bến đi, bến đến, khoảng cách, thời gian dự kiến.
- **`trips`** (Chuyến xe cụ thể): Kế thừa từ Tuyến nhưng có ngày giờ khởi hành cụ thể, gán với một xe (`bus_id`), giá vé cơ bản, trạng thái (Sắp chạy, Đang chạy, Hoàn thành).
- **`outbox_events`**: Bảng phụ lưu sự kiện tạm thời để Worker lấy đẩy lên Kafka (Outbox Pattern).

### Lưu trữ In-Memory (Thuộc `seat-service`)
- **Không dùng PostgreSQL:** Service này chạy 100% trên RAM bằng **Redis** (Key-Value) để đảm bảo tốc độ khóa/nhả ghế dưới 1 giây. Dữ liệu ghế đang giữ tạm thời (TTL) và ghế đã bán được lưu trực tiếp trên Redis.

### Database 3: `booking_db` (Thuộc `booking-service`)
- **`bookings`** (Hóa đơn): Lưu `user_id` (nếu khách đăng nhập), `trip_id`, tổng tiền hóa đơn, trạng thái thanh toán (PENDING, PAID, CANCELLED).
- **`booking_passengers`** (Chi tiết Vé): Một hóa đơn có thể mua nhiều vé. Lưu thông tin Tên hành khách, SĐT, Số ghế, Mã vé (dùng tạo QR Code check-in).
- **`outbox_events`**: Bảng phụ lưu sự kiện hóa đơn để ném qua RabbitMQ.

### Database 4: `payment_db` (Thuộc `payment-service`)
- **`transactions`** (Giao dịch): Lưu `booking_id`, số tiền thanh toán, phương thức (VNPay, Momo), trạng thái giao dịch từ đối tác (Success, Failed), mã đối tác.
- **`outbox_events`**: Bảng phụ báo kết quả thanh toán.

### Database 5: `admin_db` (Thuộc `admin-service`)
- **`buses`** (Xe khách): Quản lý đội xe của nhà xe. Lưu biển số xe, loại xe (Limousine 34, Giường nằm 40), trạng thái hoạt động (Đang rảnh, Đang sửa chữa).
- **`seat_templates`** (Tùy chọn): Lưu sơ đồ ghế mẫu cho từng loại xe để render ra giao diện.

### Database 6: `analytics_db` (Thuộc `analytics-consumer`)
*Đây là CSDL OLAP chuyên dùng cho báo cáo thống kê, không can thiệp vào luồng đặt vé.*
- **`search_logs`**: Lưu lịch sử tìm kiếm của khách (Ai, tìm tuyến nào, vào lúc mấy giờ) lấy từ Kafka.
- **`daily_revenues`**: Bảng tổng hợp doanh thu theo ngày/tháng để hiển thị Dashboard nhanh chóng mà không cần tính toán lại dữ liệu từ `bookings`.

---
*Ghi chú: Việc thiết kế chia nhỏ các bảng vào từng DB riêng biệt này đáp ứng đúng điều khoản "Single source of truth" tại Mục 1.3 của Đặc tả hệ thống.*
