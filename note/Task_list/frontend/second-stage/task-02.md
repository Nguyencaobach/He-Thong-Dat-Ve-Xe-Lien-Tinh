# Task 02: Xây dựng Trang Xác thực và Logic Server Actions

## 1. Nội dung công việc
- Tạo trang `/login` và `/register` trong thư mục `(auth)`.
- Dựng UI Form với validation nghiêm ngặt bằng thư viện `zod` và `react-hook-form`.
- Viết file `src/actions/auth.ts` (Server Actions) để xử lý logic khi submit form, giả lập API và gán HTTP-only cookie.

## 2. Ý nghĩa thực hiện
- **Zod & React Hook Form**: Giúp kiểm tra tính hợp lệ của dữ liệu đầu vào ngay trên trình duyệt (client-side validation), ví dụ bắt buộc email đúng định dạng, mật khẩu đủ độ dài trước khi gửi lên server.
- **Server Actions**: Cho phép chạy mã phía máy chủ bảo mật, dễ dàng gọi xuống GraphQL Backend và thiết lập Cookie `AUTH_COOKIE_NAME` dạng `httpOnly` để bảo mật JWT.

# Câu lệnh sử dụng
```bash
npm install react-hook-form @hookform/resolvers
```
