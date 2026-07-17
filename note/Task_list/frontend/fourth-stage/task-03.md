# Task 03: Xây dựng Trang Thanh toán (/checkout)

## 1. Nội dung công việc
Tạo giao diện trang thanh toán tại `src/app/(public)/checkout/page.tsx`. Đọc `bookingId` từ URL parameters, fetch lại thông tin đơn đặt vé bằng `getBooking`, hiển thị tổng tiền và mô phỏng giao diện QR Code thanh toán bằng CSS.

## 2. Ý nghĩa thực hiện
- Trình bày thông tin đơn hàng tóm tắt để người dùng kiểm tra trước khi chuyển tiền.
- Mô phỏng bước "Chờ thanh toán", chuẩn bị cho luồng tương tác xác nhận thanh toán giả lập.
- Xử lý các case đơn hàng không hợp lệ hoặc không ở trạng thái PENDING_PAYMENT.

# Câu lệnh sử dụng
Không có lệnh bổ sung.
