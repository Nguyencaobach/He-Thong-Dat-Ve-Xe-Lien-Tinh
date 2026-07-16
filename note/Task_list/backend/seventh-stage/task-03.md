# Task 03: Phân quyền Role = `ADMIN`/`STAFF` tại Gateway

## 1. Nội dung công việc
Áp dụng phân quyền theo role tại `api-gateway`: kiểm tra JWT token trước khi cho phép gọi các query/mutation của Module 4.

## 2. Ý nghĩa thực hiện của Task này

### Tại sao kiểm tra ở Gateway, không ở admin-service? (Đặc tả 7.3)
- **Single point of enforcement:** Gateway là entry point duy nhất từ Frontend → tất cả phân quyền tập trung ở đây. admin-service không tự check token (tin tưởng gateway).
- **Tách biệt concerns:** admin-service chỉ làm nghiệp vụ, không cần biết về JWT/auth.
- **Dễ audit:** Mọi unauthorized access đều bị chặn ở 1 nơi, log tập trung.

### Phân quyền theo từng operation
| Operation | Yêu cầu role |
|---|---|
| `getDashboardStats`, `createBus`, `deleteBus`, `blockSeat`, `unblockSeat`, `manageTrip` | `ADMIN` |
| `listBuses`, `getBus` | `ADMIN` hoặc `STAFF` |
| `checkIn` | `ADMIN` hoặc `STAFF` |
| Các query booking/trip/seat | Bất kỳ (hoặc guest) |

### Helper functions trong `resolvers.js`
- `requireAuth(context)` — Kiểm tra đã đăng nhập (có JWT hợp lệ)
- `requireAdmin(context)` — Gọi requireAuth + check `role === 'ADMIN'`
- `requireAdminOrStaff(context)` — Gọi requireAuth + check `role in ['ADMIN', 'STAFF']` **(mới thêm)**

## 3. Các file được tạo/chỉnh sửa
- `api-gateway/src/resolvers.js` — Thêm `requireAdminOrStaff()` + guard vào 8 resolvers mới
- `api-gateway/src/schema.js` — Thêm `Bus`, `BusListResult`, `CheckInResult`, `SimpleAdminResult` types + 3 queries + 5 mutations admin mới
- `api-gateway/src/grpcClients.js` — Đã có `admin` client trỏ port 50055 từ trước

## 4. Thử nghiệm phân quyền
Gọi `createBus` với token của role `CUSTOMER`:
```graphql
mutation {
  createBus(licensePlate: "51B-12345", busType: "SEAT_29", totalSeats: 29) {
    busId
  }
}
```
→ Response: `"Bạn không có quyền thực hiện thao tác này. Yêu cầu role ADMIN."`
