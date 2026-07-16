# Task 05: Cập nhật Realtime (Sơ đồ ghế)

## Mục tiêu
Tích hợp một cơ chế (Component ẩn) để tự động lắng nghe và thay đổi trạng thái của các ghế trên màn hình khi có một người dùng khác vừa mua hoặc giữ ghế đó, tránh tình trạng bán trùng (Double-booking).

## Chi tiết triển khai
- **File:** `src/components/trip/realtime-seat-sync.tsx`
- **Công nghệ:** React `useEffect`, Component Logic.
- **Tính năng:**
  - Viết Component này như một Listener (không có UI, `return null;`), chạy ngầm bên trong `SeatMap`.
  - Nhận props là `tripId` và hàm callback `onSeatStatusChange(seatId, newStatus)`.
  - **Giả lập Realtime (Mock):** Trong Giai đoạn 2 này, hệ thống sẽ mô phỏng lại luồng Pub/Sub của Backend bằng cách sử dụng `setTimeout` để đột ngột biến 1 ghế thành "Đang giữ" (HELD) và 1 ghế thành "Đã bán" (BOOKED) sau vài giây khách hàng truy cập vào trang.
  - Về mặt kiến trúc tương lai, phần giả lập này sẽ được thay thế bằng GraphQL Subscriptions hoặc kết nối SSE (Server-Sent Events) tới GraphQL Gateway. Component này sẽ gọi hook kiểu như `useSubscription` và đẩy dữ liệu mới nhất vào hàm callback.

## Trạng thái
- Đã hoàn thành (Done).
- Luồng mô phỏng sự cố có khách khác nẫng tay trên đã hoạt động hoàn hảo, giúp kiểm chứng UI chống chịu tốt với sự thay đổi của Server.
