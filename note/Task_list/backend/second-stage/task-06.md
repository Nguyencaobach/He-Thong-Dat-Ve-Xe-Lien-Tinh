# Task 06: Viết Middleware giải mã JWT, gắn `userId` và `role` vào GraphQL Context

## 1. Nội dung công việc
Tích hợp logic giải mã JWT Token vào hàm `context` của Apollo Server trong `server.js`. Mỗi request GraphQL đến sẽ được tự động bóc tách token, lấy thông tin user và gắn vào `context` để các Resolver sau này sử dụng.

## 2. Ý nghĩa thực hiện của Task này
- **Context là "thẻ ID" xuyên suốt một request:** Khi Resolver nhận được `context.user`, nó biết ngay request đến từ ai (userId, email, role) mà không cần query DB lại hay truyền token đi khắp nơi.
- **Không throw lỗi ở tầng middleware:** Nếu không có token hoặc token hết hạn, `context.user = null`. Lỗi chỉ được throw ở Resolver khi operation đó thực sự yêu cầu xác thực (qua helper `requireAuth()`). Nhờ vậy các query công khai như `searchTrips` vẫn hoạt động bình thường mà không cần token.
- **RBAC:** `context.user.role` cho phép Resolver phân quyền theo vai trò: ADMIN mới được gọi `getDashboardStats`, CUSTOMER thông thường không qua được.

## 3. Các file được tạo/chỉnh sửa
- `api-gateway/src/server.js` — Hàm `context` trong `expressMiddleware()`
- `api-gateway/src/resolvers.js` — Helper `requireAuth()` và `requireAdmin()`

## 4. Cách hoạt động

```
Request: POST /graphql
Headers: { Authorization: "Bearer eyJhbGci..." }
                    ↓
        JWT Middleware (server.js context)
                    ↓
        jwt.verify(token, JWT_SECRET)
                    ↓
        context = { user: { userId, email, role } }
                    ↓
        Resolver nhận context và kiểm tra quyền
```
