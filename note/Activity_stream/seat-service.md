# Luồng hoạt động: Seat Service (`seat-service`)

## 1. Giới thiệu chung
- **Vai trò:** Quản lý kho ghế (Seat Inventory). Đảm nhận trách nhiệm cốt lõi là ngăn chặn việc đặt trùng ghế (Race Condition) khi có nhiều người truy cập cùng lúc.
- **Công nghệ:** Node.js, gRPC Server, Redis (Thay cho SQL để xử lý tốc độ cao và lock nguyên tử).
- **Port hoạt động:** `50052`

## 2. Luồng xử lý chi tiết (Internal Logic)
Service này không dùng SQL Database mà lưu trạng thái tạm thời trên RAM thông qua Redis.
1. **Lấy sơ đồ ghế (`GetSeatMap`):**
   - Đọc template sơ đồ ghế gốc từ DB của chuyến (mock/fallback), sau đó quét trong Redis xem những ghế nào đang bị giữ (`HELD`), đã bán (`BOOKED`), hoặc bị Admin khóa (`BLOCKED`). Trộn kết quả lại và trả về cho Gateway.
2. **Giữ ghế (Locking / `HoldSeat`):**
   - Khi người dùng bấm chọn ghế, Gateway gọi RPC `HoldSeat`.
   - File `src/seatService.js` sử dụng lệnh **`SETNX` (Set if Not eXists)** của Redis. Lệnh này hoạt động ở cấp độ nguyên tử (atomic), đảm bảo nếu có 10 người cùng chọn 1 ghế ở cùng 1 phần ngàn giây, thì chỉ có đúng 1 người thao tác thành công.
   - Ghế được khóa tạm thời (TTL) trong **5 phút**. 
3. **Mở khóa ghế (Nhả ghế):**
   - Nếu thanh toán thành công, gọi `BookSeat` để chốt ghế vĩnh viễn (đổi key thành `BOOKED` không có TTL).
   - Nếu thanh toán thất bại (hoặc người dùng hủy), gọi `ReleaseSeat` xóa key khỏi Redis.
   - Nếu người dùng ngâm đơn quá 5 phút mà không thanh toán: File `server.js` được cấu hình để bật **Redis Keyspace Notifications** (lắng nghe sự kiện expired key). Khi key hết hạn, Redis báo cho service biết, service tự động hiểu là ghế đã rảnh.

## 3. Giao tiếp liên Service
- Bất cứ khi nào trạng thái ghế thay đổi (Giữ, Mở khóa, Hết hạn), `seat-service` sẽ dùng `src/rabbitmqPublisher.js` đẩy một tin nhắn (event) lên RabbitMQ.
- `api-gateway` sẽ "bắt" tin nhắn này và đẩy qua WebSocket để màn hình của tất cả người dùng khác lập tức thấy ghế đó chuyển sang màu xám (đã bị giữ).

## 4. Tổng kết đánh giá theo Đặc tả
- Giải quyết triệt để yêu cầu về Race Condition (Đặc tả Module 2).
- Cơ chế Timeout tự nhả ghế được xử lý mượt mà và tối ưu bằng Keyspace Notification thay vì dùng hàm `setInterval` quét database làm tốn tài nguyên.
