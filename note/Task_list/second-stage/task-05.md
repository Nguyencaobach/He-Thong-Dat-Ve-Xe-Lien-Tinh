# Task 05: Viết logic Đăng nhập và cấp phát JWT Token

## 1. Nội dung công việc
Viết hàm `login()` trong `authService.js` để xử lý đăng nhập: tìm user theo email → so sánh mật khẩu với bcrypt → cấp JWT Token có thời hạn.

## 2. Ý nghĩa thực hiện của Task này
- **Bảo mật thông báo lỗi:** Khi email không tồn tại hoặc sai mật khẩu, hệ thống đều trả về cùng một thông báo "Email hoặc mật khẩu không đúng" — tránh để hacker biết được email nào đã đăng ký.
- **bcrypt.compare() — không bao giờ so sánh thô:** Hàm này tự xử lý việc hash mật khẩu nhập vào rồi so sánh với hash đã lưu, đảm bảo an toàn tuyệt đối.
- **JWT Payload:** Token chứa `{ userId, email, role }`. Khi client gửi token lên, server giải mã ra ngay mà không cần query database — giảm tải đáng kể khi có nhiều request đồng thời.
- **Thời hạn token:** `JWT_EXPIRES_IN=7d` — token hết hạn sau 7 ngày, user phải đăng nhập lại. Cân bằng giữa tiện lợi và bảo mật.

## 3. Các file được tạo/chỉnh sửa
- `api-gateway/src/authService.js` — hàm `login()` và `generateToken()`

## 4. Thư viện sử dụng

```bash
# jsonwebtoken: tạo và giải mã JWT
npm install jsonwebtoken
```

## 5. Cấu trúc JWT Token
```
Header.Payload.Signature
         ↓
{ userId, email, role, iat, exp }
```
