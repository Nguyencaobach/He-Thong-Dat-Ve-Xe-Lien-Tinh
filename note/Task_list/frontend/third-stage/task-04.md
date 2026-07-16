# Task 04: Giao diện Đồng hồ đếm ngược (Timer)

## Mục tiêu
Cung cấp một component đồng hồ đếm ngược (Countdown Timer) 5 phút khi người dùng bấm xác nhận chọn ghế.

## Chi tiết triển khai
- **File:** `src/components/trip/booking-timer.tsx`
- **Công nghệ:** React Hooks (`useState`, `useEffect`), Tailwind CSS.
- **Tính năng:**
  - Nhận props `initialSeconds` (300 giây - 5 phút) và hàm callback `onExpire()`.
  - Sử dụng hàm `setInterval` của JavaScript để đếm ngược từng giây một cách mượt mà.
  - Chuyển đổi giây thành format `MM:SS` (ví dụ `05:00`).
  - Giao diện trực quan: Khi thời gian còn dưới 60 giây (`isUrgent`), đồng hồ tự động chuyển sang màu đỏ báo động (`text-red-600`) và áp dụng animation nhấp nháy (`animate-pulse`).
  - Khi đếm ngược về `0`, tự động gọi hàm `onExpire()` (Hàm này được `SeatMap` định nghĩa để reset UI về trạng thái chưa giữ ghế).

## Trạng thái
- Đã hoàn thành (Done).
- Đồng hồ được nhúng gọn gàng vào Form thông tin đặt chỗ, hoạt động chính xác.
