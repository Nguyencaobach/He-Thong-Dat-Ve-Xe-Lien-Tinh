# Task 01: Xây dựng Form Hành khách

## 1. Nội dung công việc
Tạo component `PassengerForm` tại `src/components/booking/passenger-form.tsx`. Form này sử dụng `react-hook-form` kết hợp `zod` để validate dữ liệu đầu vào. Nó render linh động số lượng form tương ứng với số ghế mà người dùng đã chọn.

## 2. Ý nghĩa thực hiện
- Đảm bảo thu thập đầy đủ thông tin hành khách (Họ tên, SĐT, Email, CMND) cho từng ghế ngồi theo đúng yêu cầu Đặc tả.
- Validate chặt chẽ phía client giúp ngăn chặn dữ liệu rác trước khi gửi lên server.
- Sử dụng UI components từ `shadcn/ui` để đồng nhất giao diện.

# Câu lệnh sử dụng
Không có lệnh bổ sung (đã sử dụng `react-hook-form` và `@hookform/resolvers` có sẵn).
