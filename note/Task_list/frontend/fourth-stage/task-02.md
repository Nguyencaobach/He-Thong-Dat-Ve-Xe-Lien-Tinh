# Task 02: Xây dựng Server Actions (Tạo Booking)

## 1. Nội dung công việc
Tạo hàm `createBookingAction` trong file `src/actions/booking.ts`. Hàm này nhận dữ liệu từ `FormData` của Form Hành khách, gọi đến hàm `createBooking` ở lớp API (`src/lib/api/bookings.ts`) để thực thi mutation `CreateBooking`.

## 2. Ý nghĩa thực hiện
- Chuyển logic gọi API sang Server Action giúp bảo mật thông tin và giảm tải cho Client.
- Chuyển đổi dữ liệu Form thành mảng hành khách và gọi GraphQL.
- Xử lý redirect một cách an toàn sang trang `/checkout` sau khi tạo đơn ở trạng thái `PENDING_PAYMENT` thành công.

# Câu lệnh sử dụng
Không có lệnh bổ sung.
