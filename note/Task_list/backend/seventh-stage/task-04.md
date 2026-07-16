# Task 04: Admin khóa ghế trống (`BLOCKED`)

## 1. Nội dung công việc
Viết logic Admin chủ động khóa một ghế cụ thể trong một chuyến, chuyển trạng thái sang `BLOCKED` — ghế bị khóa sẽ không thể được giữ bởi khách hàng.

## 2. Ý nghĩa thực hiện của Task này

### Tại sao cần khóa ghế? (Đặc tả 7.2 điểm 8)
- Ghế bị hỏng không bán được.
- Ghế dành cho VIP/nhân viên.
- Ghế ở gần bánh xe (ồn, không thoải mái) — không bán trong một chuyến cụ thể.

### Cách thực hiện 2 tầng
1. **Redis (seat-service):** Gọi gRPC `HoldSeat` với `userId = "ADMIN_BLOCK:{adminId}"` → SETNX trên Redis. Ghế sẽ ở trạng thái `HELD` với key đặc biệt → client `GetSeatMap` sẽ thấy là `BLOCKED`.
2. **Postgres (admin-service):** Ghi record vào `blocked_seats` với `is_active = true` → audit trail bền vững sau khi Redis restart.

### Unblock
- Gọi gRPC `ReleaseSeat` → seat-service xóa key Redis
- Cập nhật `blocked_seats.is_active = false` + `unblocked_at = now()`

### Khi restart Redis
- `blocked_seats` còn trong Postgres → có thể viết startup script replay block commands
- Hiện tại: Nếu cần replay, Admin chỉ cần gọi lại `blockSeat` GraphQL mutation

## 3. Các file được tạo/chỉnh sửa
- `admin-service/src/adminService.js` — `blockSeat()`, `unblockSeat()`
- `admin-service/src/adminRepository.js` — `blockSeat()`, `unblockSeat()`, `getBlockedSeatsByTrip()`
- `admin-service/src/adminGrpcHandlers.js` — `BlockSeat`, `UnblockSeat` handlers
- `api-gateway/src/resolvers.js` — `blockSeat`, `unblockSeat` mutations
- `api-gateway/src/schema.js` — `blockSeat`, `unblockSeat` mutations + `SimpleAdminResult` type

## 4. GraphQL test
```graphql
mutation {
  blockSeat(tripId: "trip-uuid", seatId: "A01", reason: "Ghế bị hỏng") {
    success
    message
  }
}
```
→ `{ success: true, message: "Ghế A01 đã bị khóa." }`
