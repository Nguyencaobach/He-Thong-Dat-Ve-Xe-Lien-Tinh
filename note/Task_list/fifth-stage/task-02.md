# Task 02: State Machine — Trạng thái đơn hàng

## 1. Nội dung công việc
Thiết kế và triển khai State Machine cho trạng thái booking trong `bookingRepository.js`, bảo đảm mọi chuyển trạng thái đều được validate trước khi ghi vào DB.

## 2. Ý nghĩa thực hiện của Task này
- **State Machine (Đặc tả 6.2):**
  ```
  PENDING_PAYMENT → PAID → TICKET_ISSUED → CHECKED_IN → COMPLETED
  PENDING_PAYMENT → EXPIRED  (hết TTL chưa thanh toán)
  PAID → CANCELLED            (khách hủy sau thanh toán)
  ```
- **`assertValidTransition()`:** Hàm validate chuyển trạng thái. Nếu code cố gắng chuyển sai (ví dụ COMPLETED → PAID), hệ thống ném lỗi rõ ràng thay vì âm thầm ghi sai dữ liệu.
- **`transition()`:** Hàm duy nhất được phép đổi trạng thái booking — đóng vai trò "cửa ngõ kiểm soát".
- **Timestamp tự động:** Khi chuyển sang PAID tự set `paid_at`, CANCELLED tự set `cancelled_at`.

## 3. Các file được tạo/chỉnh sửa
- `booking-service/src/bookingRepository.js` — Toàn bộ tầng DB: `createBooking()`, `findById()`, `findWithPassengers()`, `transition()`, `findExpiredPendingBookings()`, `expireBooking()`

## 4. Câu lệnh cần chạy
Không cần chạy lệnh riêng — logic này được kiểm thử khi khởi động và gọi API.
