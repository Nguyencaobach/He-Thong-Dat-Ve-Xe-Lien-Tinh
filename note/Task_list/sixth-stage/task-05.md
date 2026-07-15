# Task 05: Giả lập gửi Email chứa thông tin vé cho khách hàng

## 1. Nội dung công việc
Viết `emailSender.js` giả lập gửi email xác nhận đặt vé, gồm nội dung HTML đẹp với bảng danh sách vé và mã QR. Hỗ trợ 2 chế độ: `log` (ghi console, không cần SMTP) và `ethereal` (gửi email test thật qua Ethereal).

## 2. Ý nghĩa thực hiện của Task này
- **Đặc tả 6.3 điểm 7:** "Email Worker gửi email mô phỏng/ghi log" — hai chế độ phục vụ đúng yêu cầu này.
- **Chế độ `log` (mặc định, offline):**
  - Không cần SMTP server, không cần internet, không cần credential nào.
  - In ra console đầy đủ: From, To, Subject, danh sách ticketId, QR codes.
  - Phù hợp 100% cho demo và phát triển local.
- **Chế độ `ethereal` (nâng cao, có thể xem email thật):**
  - Gửi qua [https://ethereal.email](https://ethereal.email) — email test miễn phí.
  - Sau khi gửi, log xuất hiện URL để xem email trong trình duyệt.
  - Email KHÔNG đến hộp thư thật — an toàn, không spam.
- **Nội dung email HTML:** Header gradient xanh, bảng danh sách vé (ghế | hành khách | mã vé | QR), khung cảnh báo check-in màu vàng, footer. Đồng bộ thiết kế với file vé HTML.
- **Xử lý guest không có email:** Ghi log đầy đủ nhưng trường `to` fallback về `guest@example.com` — worker không crash.
- **nodemailer:** Dùng `jsonTransport` cho chế độ log (built-in trong nodemailer, không cần SMTP).

## 3. Các file được tạo/chỉnh sửa
- `notification-worker/src/emailSender.js` — `initTransporter()` + `sendBookingConfirmationEmail()` + `renderEmailHtml()`

## 4. Chế độ hoạt động

### Chế độ `log` (mặc định):
```
══════════════════════════════════════════════════════════
[notification-worker] 📧 GIẢ LẬP GỬI EMAIL:
  ► From:    "Hệ thống đặt vé xe" <noreply@bussystem.local>
  ► To:      khach@gmail.com
  ► Subject: ✅ Xác nhận đặt vé – Mã booking A1B2C3D4
  ► Tickets: TKT-A01-20261015-A1B2, TKT-B02-20261015-A1B2
  ► QR codes: A1B2C3D4-TKT-A01-... | A1B2C3D4-TKT-B02-...
══════════════════════════════════════════════════════════
```

### Chế độ `ethereal` (đặt EMAIL_MODE=ethereal trong .env):
```
[notification-worker] ✓ Email gửi thành công (Ethereal):
  ► Message ID: <abc@ethereal.email>
  ► Xem tại: https://ethereal.email/message/xxx
```
