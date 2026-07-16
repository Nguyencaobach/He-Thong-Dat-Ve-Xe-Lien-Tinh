# Task 05: `checkinService.js` — Check-in hành khách bằng mã QR

## 1. Nội dung công việc
Viết logic check-in: Staff nhập mã QR (từ vé điện tử) hoặc mã booking để đổi trạng thái hành khách sang `CHECKED_IN`.

## 2. Ý nghĩa thực hiện của Task này

### Mã QR được sinh ở đâu? (Xem Giai đoạn 6 task-02)
- `ticket-worker` sinh vé HTML, mỗi vé có mã QR dạng text: `{BOOKING_FIRST8}-{TICKETID}`
- Ví dụ: `A1B2C3D4-TKT-A01-20261015-A1B2`
- Khi Staff quét QR, giá trị này được truyền vào mutation `checkIn(qrCode: "A1B2C3D4-...")`

### Luồng xử lý (Đặc tả 7.3)
1. Parse QR → trích bookingId prefix (8 ký tự đầu)
2. Gọi gRPC `GetBooking` sang `booking-service` để xác minh booking
3. Kiểm tra:
   - Booking tồn tại
   - Booking thuộc đúng `tripId` đang check-in
   - Status = `PAID` hoặc `TICKET_ISSUED` (chưa check-in)
4. Ghi `admin_events` log: `{ event_type: 'checkin', actorId: staffId, payload: {...} }`
5. Trả về: thông tin hành khách cho Staff xác nhận

### Tại sao không tự update booking status?
- Booking state machine nằm trong `booking-service` (booking_db Postgres)
- `admin-service` không có quyền trực tiếp vào booking_db (Database-per-Service)
- Cần thêm RPC `CheckIn` vào `booking.proto` để admin-service gọi → `booking-service` tự update → trạng thái booking chính xác
- **Hiện tại:** Ghi audit log là đủ cho demo; production cần bổ sung RPC.

### Đặc tả phân quyền: ADMIN hoặc STAFF
Check-in không chỉ ADMIN mà cả STAFF cũng được (nhân viên soát vé tại điểm đón). Đã implement `requireAdminOrStaff()` guard.

## 3. Các file được tạo/chỉnh sửa
- `admin-service/src/checkinService.js` — Toàn bộ logic check-in
- `admin-service/src/adminGrpcHandlers.js` — `CheckIn` handler
- `api-gateway/src/resolvers.js` — `checkIn` mutation với `requireAdminOrStaff`
- `api-gateway/src/schema.js` — `CheckInResult` type + `checkIn` mutation

## 4. GraphQL test
```graphql
mutation {
  checkIn(
    qrCode: "A1B2C3D4-TKT-A01-20261015-A1B2",
    tripId: "trip-uuid-here",
    staffId: "staff-001"
  ) {
    success
    message
    passengerName
    seatNumber
  }
}
```
→ `{ success: true, message: "Check-in thành công!", passengerName: "Nguyễn Văn A", seatNumber: "A01" }`
