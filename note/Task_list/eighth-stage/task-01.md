# Task 01: Analytics Consumer (Kafka)

## 1. Nội dung công việc
Xây dựng `analytics-service` để lắng nghe các event từ Kafka (`search-events`, `booking-events`, `payment-events`) và ghi nhận doanh thu, lượt tìm kiếm vào cơ sở dữ liệu `analytics_db`.

## 2. Ý nghĩa thực hiện của Task này
- Áp dụng kiến trúc Event-Driven với Kafka cho hệ thống Big Data/Analytics.
- `search-events` giúp phân tích tuyến đường nào đang hot.
- `payment-events` giúp tổng hợp doanh thu theo ngày chính xác (chỉ tính giao dịch thành công).
- Xây dựng gRPC endpoint `GetDashboardStats` để `admin-service` có thể hiển thị lên giao diện quản trị.

## 3. Các file được tạo/chỉnh sửa
- `analytics-service/src/kafkaConsumer.js`: Lắng nghe message.
- `analytics-service/db/migrations/20261010100000_create_analytics_tables.js`: Tạo bảng `daily_revenue`, `route_metrics`.
- `analytics-service/src/analyticsGrpcHandlers.js`: Xử lý gRPC gọi từ Admin.
- `protos/analytics.proto`: Định nghĩa contract gRPC cho báo cáo.
- `admin-service/src/grpcClients.js`: Thêm `analyticsClient`.
- `admin-service/src/adminService.js`: Gọi gRPC sang Analytics để gom data Dashboard.
