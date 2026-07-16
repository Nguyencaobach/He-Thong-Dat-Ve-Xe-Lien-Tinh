# Task 01: Khởi tạo biến môi trường `.env.local`

## 1. Nội dung công việc
Tạo file `.env.local` tại thư mục gốc của frontend để chứa các biến môi trường cấu hình kết nối tới Gateway và tên Cookie phân quyền.

## 2. Ý nghĩa thực hiện
- `BACKEND_GRAPHQL_URL`: Trỏ tới địa chỉ API Gateway (cổng 4000) của Backend, là nơi duy nhất Frontend giao tiếp.
- `APP_URL`: Khai báo URL hiện tại của Frontend, dùng để xử lý redirect hoặc metadata.
- `AUTH_COOKIE_NAME`: Tên Cookie chứa JWT Token để Middleware và Server Actions đọc.

# Câu lệnh sử dụng
Không có lệnh. (Đã tạo thủ công file `.env.local`).
