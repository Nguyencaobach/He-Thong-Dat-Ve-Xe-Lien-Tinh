# Luồng hoạt động: Ticket Worker (`ticket-worker`)

## 1. Giới thiệu chung
- **Vai trò:** Tiến trình chạy ngầm (Background Worker) chuyên làm một việc duy nhất: Sinh ra vé điện tử (dạng HTML/PDF) khi khách thanh toán thành công.
- **Công nghệ:** Node.js, RabbitMQ.
- **Port hoạt động:** Không mở port (Không phải HTTP hay gRPC Server).

## 2. Luồng xử lý chi tiết (Internal Logic)
Đây là kiến trúc hướng sự kiện (Event-driven Architecture). 
1. **Lắng nghe sự kiện (Consumer):**
   - File `src/bookingPaidConsumer.js` luôn ở trạng thái "đang nghe ngóng" trên hệ thống RabbitMQ, theo dõi queue `booking.paid` (được đẩy lên từ booking-service).
2. **Sinh vé điện tử (`ticketGenerator.js`):**
   - Khi có tin báo "Khách vừa thanh toán mã đơn A1B2C3", Worker bắt đầu làm việc.
   - Nó tạo ra một đoạn chuỗi mã QR bảo mật theo định dạng `{BOOKING_FIRST8}-{TICKETID}` (VD: `A1B2C3D4-TKT-A01-20261015-A1B2`).
   - Sử dụng thư viện `qrcode` để vẽ mã QR thành hình ảnh dạng base64.
   - Thay thế các thông tin (Tên khách, chuyến đi, hình QR) vào một file giao diện vé mẫu (`ticket_template.html`).
   - Kết quả xuất ra file vé cụ thể nằm trong thư mục `generated-tickets`.
3. **Phát sự kiện (Publisher):**
   - Sinh vé xong, làm sao để gửi cho khách? `ticket-worker` không tự gửi email vì như thế vi phạm nguyên tắc Single Responsibility (Đơn nhiệm).
   - Nó đẩy một thông báo mới lên RabbitMQ với nhãn `ticket.issued` (Vé đã phát hành), báo cho ai đó chuyên gửi email biết.

## 3. Tổng kết đánh giá theo Đặc tả
- Kiến trúc microservices cực chuẩn: Tách bạch hoàn toàn việc đặt vé (booking), sinh vé (ticket) và gửi email (notification).
- Hệ thống không bị treo hoặc chậm nếu máy in vé chạy lâu (bất đồng bộ hoàn toàn).
