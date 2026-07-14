# Task 05: Định nghĩa giao tiếp gRPC (`.proto`)

## 1. Nội dung công việc
Khởi tạo các file `.proto` (như `trip.proto`, `seat.proto`) bên trong thư mục dùng chung `protos`. Đây là bộ "khung xương" để các Microservices có thể giao tiếp, gọi hàm của nhau.

## 2. Ý nghĩa thực hiện của Task này
- **Ngôn ngữ chung:** Vì Gateway, Trip Service, Seat Service hoàn toàn tách biệt, gRPC dùng chung một chuẩn `.proto` để định nghĩa rất rõ ràng "Hỏi cái gì, Trả lời cái gì". Tránh tình trạng service này gửi thiếu tham số làm service kia bị lỗi.
- **Tốc độ tên lửa:** gRPC truyền dữ liệu dạng nhị phân (Binary) siêu nhẹ thay vì mã hóa chữ (JSON) như API REST thông thường. Nó giúp hệ thống gọi qua lại cực kỳ mượt mà, độ trễ giảm đi 10 lần.

# Câu lệnh sử dụng để chạy
*(Ở bước này anh chưa cần chạy lệnh gì, hệ thống Node.js sẽ tự động nạp các file này khi anh em mình code ruột service ở Giai đoạn 2).*
