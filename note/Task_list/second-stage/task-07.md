# Task 07: Định nghĩa GraphQL TypeDefs cho toàn bộ hệ thống

## 1. Nội dung công việc
Viết file `schema.js` định nghĩa toàn bộ GraphQL Schema: Types, Queries, Mutations và Subscriptions — ánh xạ từ 5 file `.proto` (trip, seat, booking, payment, admin) sang ngôn ngữ GraphQL.

## 2. Ý nghĩa thực hiện của Task này
- **Bản hợp đồng Frontend-Backend:** TypeDefs xác định chính xác những gì Frontend được phép hỏi và nhận về. Frontend chỉ cần đọc schema là biết toàn bộ API mà không cần đọc code backend.
- **Từ proto → GraphQL:** Các message và service trong `.proto` (dùng cho gRPC nội bộ) được "dịch" sang Type và Query/Mutation của GraphQL (dùng cho web). Hai lớp này song song tồn tại.
- **ENUM đảm bảo tính hợp lệ:** `SeatStatus`, `BookingStatus`, `Role` là ENUM — GraphQL sẽ từ chối giá trị không hợp lệ ngay từ tầng schema trước khi vào Resolver.
- **Subscription cho real-time:** `seatStatusUpdated` cho phép Frontend subscribe và nhận cập nhật trạng thái ghế tức thời mà không cần polling (Module 2).

## 3. Các file được tạo/chỉnh sửa
- `api-gateway/src/schema.js` — Toàn bộ TypeDefs của hệ thống

## 4. Thư viện sử dụng

```bash
npm install graphql-tag graphql-subscriptions
```

## 5. Cấu trúc Schema tổng quan
```
Query:      me, searchTrips, getTripDetails, getSeatMap,
            getBooking, checkPaymentStatus, getDashboardStats
Mutation:   register, login, holdSeat, createBooking,
            cancelBooking, processPayment, manageTrip
Subscription: seatStatusUpdated
```
