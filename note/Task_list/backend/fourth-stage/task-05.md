# Task 05: Viết logic chốt ghế vĩnh viễn (HELD → BOOKED)

## 1. Nội dung công việc
Viết `bookSeat()` trong `seatRepository.js` và `seatService.js`: xóa hold key (có TTL) và tạo booked key (không TTL) trong cùng một Redis pipeline, đảm bảo atomic.

## 2. Ý nghĩa thực hiện của Task này
- **Kịch bản:** Khách thanh toán thành công → `booking-service` gọi gRPC `BookSeat` vào `seat-service` → `seat-service` thực hiện HELD → BOOKED.
- **Tại sao dùng pipeline?** Xóa hold key và tạo booked key là 2 lệnh riêng biệt. Nếu xử lý tuần tự (xóa xong mới tạo), có một khoảnh khắc cực ngắn ghế ở trạng thái "không hold mà cũng chưa booked" → người khác có thể chen vào. Redis pipeline gom 2 lệnh vào 1 round-trip, thực thi tuần tự và gần như atomic.
- **Kiểm tra TTL trước:** Nếu hold key đã hết TTL (quá 5 phút mà chưa thanh toán xong), `bookSeat()` trả về `success=false` với thông báo "Phiên giữ ghế đã hết hạn". Đây là trường hợp đặc tả yêu cầu: "Booking hết hạn thanh toán → ghế tự động giải phóng, booking chuyển EXPIRED."
- **bookingId từ gRPC Metadata:** `seatGrpcHandlers.js` đọc `bookingId` và `userId` từ gRPC metadata header (không phải từ body proto). Đây là pattern gRPC chuẩn để truyền context metadata mà không làm thay đổi proto definition.

## 3. Các file được tạo/chỉnh sửa
- `seat-service/src/seatRepository.js` — `bookSeat()` với pipeline, `bookSeatDirect()` dự phòng
- `seat-service/src/seatService.js` — `bookSeat()` kèm publish Pub/Sub "BOOKED" sau khi chốt
- `seat-service/src/seatGrpcHandlers.js` — `BookSeat` handler đọc metadata gRPC

## 4. Câu lệnh cần chạy
*(Không cần lệnh riêng — được test qua luồng thanh toán ở Giai đoạn 5)*

**Test thủ công bằng GraphQL Sandbox:**
```graphql
# Bước 1: Giữ ghế
mutation { holdSeat(tripId: "1", seatId: "1_A01") { success message } }

# Bước 2: Kiểm tra sơ đồ — ghế A01 phải là HELD
query { getSeatMap(tripId: "1") { seats { seatNumber status } } }
```
