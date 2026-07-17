# Task 04: Server Action mô phỏng Thanh toán

## 1. Nội dung công việc
Bổ sung hàm `processPaymentAction` vào `src/actions/booking.ts`. Hàm này gắn với hai nút "Thanh toán thành công" và "Thanh toán thất bại" trên trang Checkout.

## 2. Ý nghĩa thực hiện
- Nếu chọn "Thành công", sẽ gọi mutation `ProcessPayment` xuống Backend, lúc này Backend sẽ gửi event Kafka, chốt ghế `BOOKED`, và chuẩn bị sinh vé, sau đó Frontend chuyển hướng người dùng sang `/ticket`.
- Nếu chọn "Thất bại", trả về lỗi để giao diện hiển thị mà không gọi chốt vé.

# Câu lệnh sử dụng
Không có lệnh bổ sung.
