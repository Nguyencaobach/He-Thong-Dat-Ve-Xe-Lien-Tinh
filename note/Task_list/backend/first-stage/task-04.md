# Task 04: Định nghĩa Schema JSON cho Event (`event-schemas`)

## 1. Nội dung công việc
Tạo các file định nghĩa cấu trúc dữ liệu (JSON Schema) cho các sự kiện nhắn tin giữa các service qua RabbitMQ/Kafka (như `searchEvent`, `bookingCreated`, `bookingPaid`). Đồng thời cài đặt công cụ kiểm tra tính hợp lệ của dữ liệu (`ajv`).

## 2. Ý nghĩa thực hiện của Task này
- **Hợp đồng dữ liệu (Data Contract):** Khi `booking-service` gửi một tin nhắn báo hiệu "Đã thanh toán" sang cho `ticket-worker` để in vé, nhỡ nó gửi thiếu mã đơn hàng (`bookingId`) thì sao? Thằng in vé sẽ bị lỗi. Schema này đóng vai trò như một "bảo vệ cửa", bắt buộc gói hàng (tin nhắn) gửi đi phải có đầy đủ các thông tin bắt buộc.
- **Dùng chung toàn dự án:** Bằng cách bỏ nó vào thư mục chung `packages/event-schemas`, cả thằng gửi (Publisher) và thằng nhận (Consumer) đều có thể `require` nó vào để kiểm duyệt (validate) dữ liệu, tránh tình trạng "ông nói gà bà hiểu vịt".

# Câu lệnh sử dụng để chạy

- npm install ajv ajv-formats
