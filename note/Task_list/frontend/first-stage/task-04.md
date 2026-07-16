# Task 04: Quản lý Xác thực Session

## 1. Nội dung công việc
Tạo file `src/lib/auth/session.ts` để đọc/ghi HTTP-only Cookie và giải mã JWT token.

## 2. Ý nghĩa thực hiện
Server Actions và Middleware cần cách an toàn để đọc thông tin người dùng đang đăng nhập. Việc giải mã Token (JWT Decode) qua thư viện `jose` giúp Edge Runtime của Next.js có thể biết User đó là ADMIN hay CUSTOMER mà không cần gọi về Backend.

# Câu lệnh sử dụng
```bash
npm install jose
```
