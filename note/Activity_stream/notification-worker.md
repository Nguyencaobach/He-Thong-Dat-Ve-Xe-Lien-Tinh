# Luồng hoạt động: Notification Worker (`notification-worker`)

## 1. Giới thiệu chung
- **Vai trò:** Tiến trình chạy ngầm (Background Worker). Đóng vai trò như một "người đưa thư", gửi Email/SMS thông báo cho hành khách.
- **Công nghệ:** Node.js, RabbitMQ, Nodemailer.
- **Port hoạt động:** Không mở port.

## 2. Luồng xử lý chi tiết (Internal Logic)
Đây là khâu cuối cùng trong chuỗi thanh toán - lấy vé.
1. **Lắng nghe sự kiện (Consumer):**
   - File `src/ticketIssuedConsumer.js` lắng nghe queue `ticket.issued` từ RabbitMQ (do `ticket-worker` vừa đẩy lên lúc nãy).
2. **Gửi Email (`emailSender.js`):**
   - Lấy thông tin từ Message (gồm email của khách, mã vé, đường dẫn file HTML của vé).
   - Sử dụng thư viện `nodemailer` để khởi tạo tiến trình gửi email.
   - Do đây là bản mô phỏng phát triển, thay vì gửi qua máy chủ SMTP thực tế (như Gmail hay SendGrid), hệ thống sử dụng `jsonTransport` (chế độ log).
   - Bức thư không thực sự bay qua Internet mà được in ra dưới dạng một JSON log đẹp mắt trên màn hình Terminal (Console) của developer để dễ dàng kiểm tra. Nếu muốn gửi thật, chỉ cần đổi chuỗi kết nối SMTP là xong.
3. **Hoàn tất:** Đánh dấu Message Queue là đã xử lý xong (ack). Khép lại vòng đời của một khách hàng mua vé thành công.

## 3. Tổng kết đánh giá theo Đặc tả
- Đóng gói chức năng độc lập (loosely coupled), worker này sập thì hệ thống đặt vé vẫn hoạt động bình thường, email chỉ bị delay đợi worker sống lại gửi bù (nhờ tính năng lưu tin nhắn của RabbitMQ).
- Hoàn thành đầy đủ Giai đoạn 6 theo chuẩn thiết kế.
