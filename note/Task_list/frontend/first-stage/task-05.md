# Task 05: Route Protection với Middleware

## 1. Nội dung công việc
Tạo file `src/middleware.ts` ở thư mục `src/`.

## 2. Ý nghĩa thực hiện
Next.js Middleware chạy trước khi request chạm vào Server. Nhiệm vụ của nó là "gác cổng".
- Chặn tất cả truy cập vào `/admin/...` nếu không có role ADMIN/STAFF.
- Chặn tất cả truy cập vào `/customer/...` nếu không có role CUSTOMER.
- Redirect về `/login` một cách cực kỳ mượt mà.

# Câu lệnh sử dụng
Không có lệnh.
