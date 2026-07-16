# Task 01: Thiết lập thư mục Route `(public)` và `(auth)`

## 1. Nội dung công việc
Tạo các thư mục route group `(public)` và `(auth)` trong `src/app`.
Cấu hình layout riêng cho từng nhóm trang để quản lý giao diện Header/Footer độc lập.

## 2. Ý nghĩa thực hiện
- `(public)`: Nhóm các trang hiển thị công khai (Trang chủ, Tìm chuyến) sử dụng chung `SiteHeader` và `SiteFooter`.
- `(auth)`: Nhóm các trang đăng nhập/đăng ký có giao diện tối giản (center form) không bị phân tâm bởi các thành phần khác.
- Việc dùng thư mục có dấu ngoặc đơn `()` trong Next.js giúp nhóm các route theo logic (Route Groups) mà không làm ảnh hưởng tới đường dẫn URL.

# Câu lệnh sử dụng
Không có lệnh. (Đã tạo thủ công các file `layout.tsx` cho từng thư mục).
