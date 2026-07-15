# Luồng hoạt động: API Gateway (`api-gateway`)

## 1. Giới thiệu chung
- **Vai trò:** Là cửa ngõ duy nhất (Entry Point) giao tiếp với Frontend/Client. Bảo vệ và điều phối các request xuống các Microservices phía sau.
- **Công nghệ:** Node.js, Apollo Server (GraphQL), gRPC Client, JWT Auth, PubSub (WebSocket).
- **Port hoạt động:** `4000`

## 2. Cách thức định tuyến Request (Routing tới các port của Service)
Khi người dùng truy cập chức năng từ Frontend, luồng đi như sau:
1. **Client gửi Request:** Gửi một query/mutation GraphQL qua HTTP POST tới `http://localhost:4000/graphql`.
2. **Gateway tiếp nhận & Định tuyến (Schema & Resolvers):** 
   - File `src/schema.js` định nghĩa các "hợp đồng" dữ liệu (các API có thể gọi).
   - File `src/resolvers.js` là nơi xử lý logic điều hướng. Tại đây, Gateway ánh xạ câu hỏi của người dùng tới đúng Service.
3. **Giao tiếp qua gRPC Client:**
   - Thay vì gọi HTTP, Gateway dùng gRPC để gọi xuống các service nội bộ nhằm tối ưu tốc độ.
   - File `src/grpcClients.js` nạp các file `.proto` (VD: `trip.proto`, `booking.proto`) và tạo ra các client kết nối trực tiếp tới các port cụ thể:
     - `TripService` -> Port `50051`
     - `SeatService` -> Port `50052`
     - `BookingService` -> Port `50053`
     - `PaymentService` -> Port `50054`
     - `AdminService` -> Port `50055`
4. **Trả về kết quả:** Sau khi gRPC server xử lý xong và trả kết quả về Gateway, Gateway sẽ gói lại thành chuẩn JSON của GraphQL và trả về cho Client.

## 3. Luồng xử lý chi tiết bên trong API Gateway
- **Xác thực và Phân quyền (Auth & RBAC):** 
  - File `src/authService.js` xử lý cấp phát token JWT khi user đăng nhập.
  - Khi request tới, Apollo Context kiểm tra JWT. Trong `resolvers.js`, các hàm helper như `requireAuth()`, `requireAdmin()`, `requireAdminOrStaff()` đóng vai trò "người bảo vệ", chặn đứng các request không hợp lệ ngay tại cổng trước khi gọi xuống Service.
- **Thời gian thực (Real-time) với WebSocket:**
  - Để cập nhật trạng thái ghế trống/đã đặt realtime, Gateway sử dụng GraphQL Subscriptions.
  - File `src/seatEventsConsumer.js` lắng nghe RabbitMQ (khi có ai đó đặt ghế).
  - Nó bắn sự kiện vào `src/pubsub.js`, từ đó đẩy dữ liệu qua WebSocket xuống thẳng màn hình của người dùng đang xem sơ đồ ghế.

## 4. Tổng kết đánh giá theo Đặc tả
- Đã đáp ứng đúng yêu cầu "Single point of enforcement" trong đặc tả.
- Các API đều được gom về một mối GraphQL, Frontend không cần biết sự tồn tại của các port 50051, 50052...
