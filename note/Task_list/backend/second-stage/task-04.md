# Task 04: Viết logic Đăng ký tài khoản (`authService.js`)

## 1. Nội dung công việc
Viết hàm `register()` trong `authService.js` và `authRepository.js` để xử lý luồng đăng ký tài khoản mới: kiểm tra email trùng lặp → hash mật khẩu → lưu DB → cấp JWT.

## 2. Ý nghĩa thực hiện của Task này
- **Tách Repository và Service:** `authRepository.js` chỉ làm việc với Database (SELECT, INSERT). `authService.js` chứa logic nghiệp vụ (kiểm tra điều kiện, hash, tạo token). Tách như vậy giúp code dễ test và bảo trì hơn.
- **Không lưu mật khẩu thô:** `bcrypt.hash(password, 12)` tạo ra một chuỗi hash ngẫu nhiên mỗi lần. Dù database bị lộ, hacker vẫn không thể khôi phục mật khẩu gốc.
- **Cấp token ngay sau đăng ký:** User không cần đăng nhập lại sau khi vừa đăng ký — trải nghiệm tốt hơn.

## 3. Các file được tạo/chỉnh sửa
- `api-gateway/src/authRepository.js` — `findByEmail()`, `findById()`, `create()`
- `api-gateway/src/authService.js` — `register()`, `login()`, `getMe()`

## 4. Thư viện sử dụng

```bash
# bcryptjs: thư viện hash mật khẩu (không cần biên dịch native như bcrypt)
npm install bcryptjs
```
