# Task 03: Server Actions (Logic giữ ghế)

## Mục tiêu
Xây dựng một Server Action để gọi API (Mutation) từ Client xuống Backend khi người dùng xác nhận giữ ghế.

## Chi tiết triển khai
- **File:** `src/actions/seat.ts`
- **Công nghệ:** Next.js Server Actions (`"use server"`).
- **Tính năng:**
  - Định nghĩa hàm `holdSeatsAction(data)` nhận vào `tripId` và mảng `seatIds`.
  - Giả lập việc gọi một GraphQL Mutation (`HoldSeats`) xuống GraphQL Gateway -> Seat Inventory Service (theo kiến trúc).
  - Trả về đối tượng `{ success: true, holdToken: string }` nếu giữ ghế thành công.
  - Tích hợp logic xử lý lỗi (Conflict: có người khác mua mất) bằng cách kiểm tra mảng ID để từ chối và trả về `error`.

## Trạng thái
- Đã hoàn thành (Done).
- Action đã được bọc bằng `useTransition` ở component `SeatMap` (Client) để hiển thị trạng thái "Đang xử lý..." không giật lag (Optimistic UI update).
