# Roadmap Hoàn Thiện Backend Hệ Thống Đặt Vé Xe Liên Tỉnh

Dưới đây là danh sách toàn bộ các task (công việc) đã được chia nhỏ chi tiết nhất có thể để anh dễ dàng thực hiện. Khi code xong phần nào, anh chỉ cần điền dấu `x` vào ô trống (ví dụ: `[x]`) để đánh dấu hoàn thành.

---

## Giai đoạn 1: Khởi tạo Hạ tầng & Nền tảng Dùng chung
- [x] Khởi chạy file `docker-compose.yml` để dựng Postgres, Redis, RabbitMQ, Kafka.
- [x] Định nghĩa `workspaces` trong `package.json` ở thư mục gốc để quản lý monorepo.
- [x] Cài đặt các package cơ bản cho thư mục `packages/common-utils` (Logger, Error Handler).
- [x] Định nghĩa Schema JSON cho các luồng event trong `packages/event-schemas`.
- [x] Viết code cho các file `.proto` (Định nghĩa gRPC interface cho Trip, Seat, Booking, Payment, Admin).
- [x] Cấu hình và chạy thử các script SQL tạo Database trong `infrastructure/init-db/`.

## Giai đoạn 2: API Gateway & Authentication (Lễ tân kiêm Bảo vệ)
- [x] Khởi tạo dự án Apollo Server (GraphQL) trong `api-gateway`.
- [x] Viết `db.js` để kết nối vào Database `users` của Gateway.
- [x] Tạo bảng `Users` (id, email, password, role).
- [x] Viết logic Đăng ký tài khoản (`authService.js`).
- [x] Viết logic Đăng nhập, kiểm tra mật khẩu và cấp phát **JWT Token**.
- [x] Viết Middleware để giải mã JWT, bóc tách `userId` và `role` gắn vào GraphQL Context.
- [x] Định nghĩa GraphQL `TypeDefs` cho toàn bộ hệ thống (dựa theo các file proto).
- [x] Khởi tạo các gRPC Clients để gọi xuống các service bên dưới (`grpcClients.js`).

## Giai đoạn 3: Module 1 - Trip/Search Service (Tìm kiếm & Tuyến xe)
- [x] Khởi tạo kết nối Knex (Postgres) và Redis trong `trip-service`.
- [x] Viết Knex Migrations để tạo bảng `Routes` (Tuyến) và `Trips` (Chuyến).
- [x] Viết File Seed để chèn dữ liệu mẫu (Sài Gòn - Đà Lạt, v.v...).
- [x] Cài đặt gRPC Server lắng nghe Gateway.
- [x] Viết logic `routeService.js`: Autocomplete tìm kiếm điểm đi, điểm đến.
- [x] Viết logic `tripService.js`: Tìm chuyến xe theo Ngày và Tuyến.
- [x] Thêm logic Cache vào Redis (`tripCache.js`) cho kết quả tìm chuyến.
- [x] **Outbox Pattern:** Lưu log tìm kiếm vào bảng `outbox_events`.
- [x] **Outbox Pattern:** Viết cronjob `outboxWorker.js` đọc bảng để ném event `search-events` lên Kafka.

## Giai đoạn 4: Module 2 - Seat Inventory Service (Kho ghế & Realtime)
- [x] Khởi tạo kết nối Redis trong `seat-service` (Service này không xài Postgres).
- [x] Viết gRPC Server lắng nghe lệnh Giữ ghế / Lấy sơ đồ ghế.
- [x] Cài đặt cơ chế **SETNX** trên Redis để giữ ghế nguyên tử (Atomic hold) kèm TTL 5 phút.
- [x] Viết logic nhả ghế (khi hết hạn TTL hoặc khách hủy).
- [x] Viết logic chốt ghế vĩnh viễn (chuyển sang trạng thái BOOKED khi đã thanh toán).
- [x] Phát sự kiện thay đổi trạng thái ghế lên kênh **Redis Pub/Sub** (`redisPubSub.js`).
- [x] Ở `api-gateway`, viết `seatEventsConsumer.js` lắng nghe Pub/Sub và đẩy dữ liệu về Frontend qua **GraphQL Subscriptions**.
- [ ] **Bổ sung tích hợp:** Kết nối Frontend `seat-map.tsx` với API `getSeatMap` và WebSockets (`graphql-ws`) thực tế của Backend để thay thế toàn bộ dữ liệu ghế mock/giả lập ban đầu.

## Giai đoạn 5: Module 3 - Booking & Payment (Đặt vé & Thanh toán)
- [x] `booking-service`: Viết Knex Migrations tạo bảng `Bookings` và `Passengers`.
- [x] Viết State Machine: Trạng thái đơn hàng `DRAFT` -> `PENDING_PAYMENT` -> `PAID` -> `CANCELLED`.
- [x] Viết logic tạo Booking mới: Gọi gRPC sang `seat-service` để giữ ghế, nếu thành công thì tạo đơn hàng `PENDING`.
- [x] Viết logic giả lập xử lý trong `payment-service` (Trả về thành công/thất bại).
- [x] Tích hợp Saga/Outbox: Khi thanh toán thành công, ném event lên RabbitMQ.
- [x] `booking-service` lắng nghe event thanh toán, đổi trạng thái đơn sang `PAID` và gọi gRPC chốt ghế vĩnh viễn.
- [x] Đẩy sự kiện `booking.paid` vào Outbox để chuẩn bị sinh vé (RabbitMQ) và đẩy thống kê lên Kafka.
- [x] **Bổ sung API:** Thêm thông tin `passengers` vào `booking.proto`, `schema.js` và `bookingGrpcHandlers.js` để Frontend truyền họ tên/SĐT khách hàng khi tạo Booking.
- [x] Cập nhật Backend (Lỗi đồng bộ ghế)
  - [x] Bổ sung mảng passengers vào BookingResponse trong booking.proto và bookingGrpcHandlers.js.
  - [x] Sửa triệt để lỗi đếm sai ghế (Còn 33/32 chỗ trống ảo): Thay vì trip-service cộng trừ ghế mù quáng gây sai số, đã viết lại hàm getOccupiedSeatCount() trong seat-service quét chính xác từng ghế bị chiếm từ Redis, rồi ném số đó sang trip-service tính ra số ghế trống thực tế (total_seats - occupied_seats).
  - [x] Bật Cron Job định kỳ 1 phút dọn rác các booking chưa thanh toán và hết hạn trong booking-service/src/server.js.
- [x] Cập nhật API Gateway & GraphQL
  - [x] Sửa schema.js để hỗ trợ passengers (tạo type Passenger).
  - [x] Bổ sung lấy passengers trong GET_BOOKING_QUERY.

  
## Giai đoạn 6: Các Worker Chạy Nền (Sinh vé & Gửi Email)
- [x] `ticket-worker`: Kết nối RabbitMQ, lắng nghe hàng đợi `booking.paid`.
- [x] Viết logic sinh file vé PDF/HTML chứa mã QR mô phỏng (`ticketGenerator.js`).
- [x] Khi sinh vé xong, phát tiếp event `ticket.issued` lên RabbitMQ.
- [x] `notification-worker`: Lắng nghe hàng đợi `ticket.issued`.
- [x] Viết logic giả lập gửi Email cho khách hàng chứa file vé vừa tạo.

## Giai đoạn 7: Module 4 - Admin Service (Quản trị & Vận hành)
- [x] Viết Knex Migrations tạo bảng cấu hình Xe (`Bus`), Sơ đồ ghế template.
- [x] Viết gRPC Server cho các thao tác CRUD của Admin.
- [x] Áp dụng phân quyền: Ở Gateway kiểm tra Role = `ADMIN` mới truyền request xuống service này.
- [x] Viết logic Admin chủ động Khóa ghế trống (`BLOCKED`).
- [x] Viết logic `checkinService.js`: Staff quét mã QR/Mã vé để đổi trạng thái sang `CHECKED_IN`.

## Giai đoạn 8: Module 5 - Analytics, Chatbot & MCP

> **[IMPORTANT] NGUYÊN TẮC KIẾN TRÚC & BẢO MẬT (WebAI Architecture)**
> - **Chỉ dùng Gemini (Google):** Sử dụng `@ai-sdk/google` thay cho OpenAI.
> - **Client Thông minh:** AI tuyệt đối không chọc thẳng vào Database. Mọi Tool đều phải gọi qua gRPC/Gateway để kế thừa phân quyền hiện có.
> - **Phân bạch RAG và Tool:** RAG dùng cho dữ liệu tĩnh (Chính sách hủy vé). Tool dùng cho dữ liệu động (Tìm chuyến, tra vé).
> - **Chống Ảo giác (Hallucination):** Bắt buộc AI trả lời "Chưa đủ thông tin" nếu Tool/RAG không trả về dữ liệu.
> - **Bảo vệ Hệ thống:** Cài đặt `express-rate-limit` chống spam cạn tiền, che giấu Stack Trace lỗi kỹ thuật.

- [x] **Phần 1: Analytics (Kafka)**
  - [x] `analytics-consumer`: Dùng `kafkajs` lắng nghe Kafka (`search-events`, `booking-events`, `payment-events`).
  - [x] Lưu dữ liệu phân tích vào Database Analytics (Postgres riêng) qua Knex.
  - [x] Viết API báo cáo doanh thu, tỷ lệ chuyển đổi cho `admin-service` làm Dashboard.
- [x] **Phần 2: Chatbot Service (Vercel AI SDK & Gemini)**
  - [x] Khởi tạo `chatbot-service`: Tích hợp Vercel AI SDK (`@ai-sdk/google`), dùng hàm `streamText` trả luồng hội thoại (API Backend thuần).
  - [x] Thiết lập Rate Limit (`express-rate-limit`) chống spam cạn Quota API.
  - [x] Ứng dụng RAG: Dùng `embedMany` (model `text-embedding-004`) vector hóa "Chính sách nhà xe". Dùng `cosineSimilarity` tìm ngữ cảnh đưa vào Prompt.
  - [x] Áp dụng Tool Calling: Dùng thư viện `zod` định nghĩa input schema cho các tools `searchTrips`, `getBookingStatus`.
  - [x] Viết logic cho Tools: Gọi gRPC sang `trip-service` và `booking-service`. Xử lý lỗi mượt mà, không trả ra lỗi hệ thống cho AI.
- [x] **Phần 3: MCP Server (Model Context Protocol)**
  - [x] `mcp-server`: Xây dựng server độc lập theo chuẩn MCP (`@modelcontextprotocol/sdk`).
  - [x] Cấu hình Resources (`policy://cancellation`) và Tools (`search_trips`, `get_revenue_summary`) gọi ngầm qua gRPC an toàn để expose cho AI Agent bên ngoài.

## Giai đoạn 9: Kiểm thử Tối hậu & Đóng gói
- [ ] Giả lập 2 người cùng gọi API giữ 1 ghế cùng lúc (Race condition test) - Đảm bảo chỉ 1 người được.
- [ ] Chạy luồng Đặt vé nhưng không thanh toán - Đảm bảo ghế tự nhả ra sau 5 phút.
- [ ] Hoàn thiện file cấu hình Nginx (`nginx.conf`) để Load Balancing gRPC.
- [ ] Cấu hình Dockerfiles để đóng gói toàn bộ các service lên môi trường Production.
