# Task 02: `ticketGenerator.js` — Sinh file vé HTML chứa mã QR mô phỏng

## 1. Nội dung công việc
Viết logic sinh vé điện tử đầy đủ theo đặc tả 6.4: mỗi ghế trong booking sinh ra 1 file HTML riêng, chứa đầy đủ thông tin hành khách, tuyến xe và mã QR mô phỏng.

## 2. Ý nghĩa thực hiện của Task này
- **1 vé / 1 ghế / 1 hành khách (Đặc tả 6.4):** Nếu booking có 3 ghế → sinh 3 file vé riêng biệt, mỗi file chứa thông tin của đúng hành khách ngồi ghế đó.
- **Nội dung vé (Đặc tả 6.4):** Mã booking, mã vé, họ tên hành khách, điểm đón/trả, ngày giờ khởi hành, số ghế, loại xe, giá vé, mã QR, chính sách check-in.
- **Mã QR mô phỏng:** Dạng text `BOOKINGID-TICKETID` (ví dụ: `A1B2C3D4-TKT-A01-20261015-A1B2`). Không cần thư viện generate QR image — text dạng này đủ để Staff quét nhận dạng thủ công trong demo.
- **Mã vé (`ticketId`):** Format `TKT-{SEATID}-{DATE}-{SUFFIX}` — ngắn, dễ đọc, dễ nhớ.
- **Lưu file HTML:** Ghi vào `services/ticket-worker/generated-tickets/{ticketId}.html` — có thể mở trực tiếp bằng trình duyệt hoặc export PDF bằng Ctrl+P.
- **Thiết kế vé đẹp:** CSS inline, gradient header màu xanh, info-grid 2 cột, QR box monospace tối màu, policy notice màu vàng. Đảm bảo ấn tượng khi demo.

## 3. Các file được tạo/chỉnh sửa
- `ticket-worker/src/ticketGenerator.js` — `generateTickets(bookingPayload)`: trả về array vé `[{ ticketId, seatId, qrCode, htmlPath, passengerName, passengerEmail }]`

## 4. Câu lệnh cần chạy
Không cần chạy riêng — được gọi bởi `bookingPaidConsumer.js` khi nhận message. Sau khi chạy, kiểm tra thư mục:
```bash
ls Backend/services/ticket-worker/generated-tickets/
# Xuất hiện file: TKT-A01-20261015-XXXX.html
```
