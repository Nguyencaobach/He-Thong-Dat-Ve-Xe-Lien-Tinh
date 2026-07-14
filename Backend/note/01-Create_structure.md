# Định nghĩa cấu trúc cho hệ thống
bus-booking-microservices/
├── api-gateway/                # GraphQL Server (Điểm vào duy nhất cho Web/App)
│   ├── src/
│   │   ├── resolvers/          # GraphQL Resolvers (gọi gRPC clients)
│   │   ├── typeDefs/           # GraphQL Schema
│   │   └── server.js           # Apollo Server Setup
│   └── package.json
│
├── services/                   # Chứa toàn bộ các Microservices độc lập
│   ├── trip-service/           # Quản lý Tuyến, Chuyến xe, Tìm kiếm (Module 1)
│   ├── seat-service/           # Quản lý sơ đồ ghế, Giữ chỗ TTL bằng Redis (Module 2)
│   ├── booking-service/        # Quản lý đơn hàng (Saga Orchestrator, State Machine) (Module 3)
│   ├── payment-service/        # Giả lập thanh toán (Module 3)
│   ├── ticket-worker/          # Consumer RabbitMQ: Sinh vé điện tử (Module 3)
│   ├── notification-worker/    # Consumer RabbitMQ: Gửi email giả lập (Module 3)
│   ├── admin-service/          # Quản trị hệ thống, Dashboard (Module 4)
│   ├── analytics-consumer/     # Consumer Kafka: Đọc search-events, booking-events (Module 5)
│   ├── chatbot-service/        # Chatbot AI SDK (Module 5)
│   └── mcp-server/             # MCP Server kết nối với Claude/Agent ngoài (Module 5)
│
├── protos/                     # Thư mục dùng chung chứa định nghĩa gRPC (.proto)
│   ├── trip.proto
│   ├── seat.proto
│   ├── booking.proto
│   ├── payment.proto
│   └── admin.proto
│
├── infrastructure/             # Cấu hình hạ tầng & triển khai
│   ├── nginx/                  # Nginx configs (Reverse Proxy, gRPC Load Balancing)
│   ├── init-db/                # Script SQL tạo các Database riêng cho từng service
│   ├── rabbitmq/               # Config RabbitMQ (nếu cần)
│   └── kafka/                  # Config Kafka (Topics)
│
├── packages/                   # (Tùy chọn) Code dùng chung giữa các services
│   ├── common-utils/           # Các hàm utils, logger, error handler
│   └── event-schemas/          # Định nghĩa schema cho RabbitMQ/Kafka events
│
├── docker-compose.yml          # Setup toàn bộ Postgres, Redis, RabbitMQ, Kafka, Zookeeper, Nginx
├── package.json                # Định nghĩa workspaces cho toàn bộ repo
└── README.md

# Cách vận hành hệ thống

#### 1. Thư mục `api-gateway/` (Lễ tân trung tâm)
- **Định nghĩa**: Đây là điểm chạm (entry point) duy nhất của toàn bộ hệ thống đối với thế giới bên ngoài (Frontend Web, Mobile App). Chạy trên nền tảng GraphQL (với Apollo Server).
- **Cách vận hành**: Khi người dùng web bấm tìm chuyến xe, request sẽ không gọi thẳng vào `trip-service`. Thay vào đó, nó gửi một truy vấn GraphQL đến `api-gateway`. Gateway sẽ đóng vai trò "chuyển ngữ": nó đọc request, dùng gRPC client để gọi xuống `trip-service` nội bộ lấy dữ liệu, đóng gói lại cho đẹp rồi mới trả về cho Frontend. Nó cũng đảm nhiệm việc kiểm tra Token (Authentication) trước khi cho phép gọi xuống các service nghiệp vụ.

### 2. Thư mục `services/` (Các phòng ban chuyên trách)
Đây là trái tim của hệ thống, chứa các microservice độc lập. Mỗi thư mục bên trong là một project Node.js riêng biệt, có DB riêng và tự lo việc của mình. Chúng được chia làm 3 nhóm chính:

**Nhóm A: Các Service nghiệp vụ lõi (Giao tiếp đồng bộ qua gRPC)**
- `trip-service/`: Quản lý lịch trình, bến xe, nhà xe. Khi có request tìm kiếm chuyến, nó sẽ chọc vào Database của nó hoặc đọc từ cache Redis để trả về kết quả nhanh nhất.
- `seat-service/`: Nắm giữ sơ đồ ghế. Khi có request "Giữ ghế A01", nó sẽ dùng Redis (cơ chế SETNX và TTL) để khóa ghế lại trong 5 phút. Hết 5 phút mà không ai thanh toán, ghế tự nhả ra.
- `booking-service/`: Kẻ điều phối (Orchestrator). Khi khách chốt đặt vé, service này sẽ đứng ra điều hành: nó bảo `seat-service` chốt ghế vĩnh viễn, bảo `payment-service` trừ tiền. Nếu mọi thứ OK, nó ghi nhận đơn hàng thành công và phát loa (publish event) lên RabbitMQ.
- `payment-service/`: Chỉ chuyên làm một việc là giả lập xử lý thẻ tín dụng/thanh toán.
- `admin-service/`: Chuyên phục vụ các tác vụ của Nhân viên/Quản trị viên như thêm chuyến, cấu hình giá, check-in hành khách.

**Nhóm B: Các Worker chạy nền (Giao tiếp bất đồng bộ qua RabbitMQ/Kafka)**
- `ticket-worker/`: Không ai gọi nó cả. Nó chỉ chầu chực nghe ngóng trên RabbitMQ. Khi `booking-service` báo "Đơn hàng #123 đã thanh toán", nó lôi dữ liệu ra sinh file vé PDF/HTML và lưu lại.
- `notification-worker/`: Tương tự như trên, hễ có vé mới là nó tự động lấy thông tin gửi email mô phỏng cho khách hàng mà không làm chậm trải nghiệm chờ đợi của người mua vé trên web.
- `analytics-consumer/`: Chuyên nghe ngóng luồng sự kiện từ Kafka (số lượt tìm kiếm, luồng click, doanh thu). Nó lôi dữ liệu này về, nhào nặn lại để phục vụ biểu đồ thống kê cho màn hình Admin.

**Nhóm C: AI & Tích hợp**
- `chatbot-service/`: Nuôi mô hình AI (AI SDK). Khi khách hỏi "Chính sách hủy vé thế nào", nó sẽ lục tìm tài liệu nội bộ trả lời. Khi khách hỏi "Có vé đi Đà Lạt tối nay không?", nó sẽ tự động dùng tính năng Function Calling để chọc vào `trip-service` tìm vé cho khách.
- `mcp-server/`: Đóng gói các hàm tìm vé, tra cứu đơn hàng... thành các "Tools" chuẩn để các con AI bên ngoài (như Claude Desktop) có thể hiểu và xài được hệ thống của bạn.

### 3. Thư mục `protos/` (Tập hồ sơ Hợp đồng)
- **Định nghĩa**: Chứa các file `.proto` (Protocol Buffers).
- **Cách vận hành**: Các file này định nghĩa chính xác cấu trúc dữ liệu gửi/nhận (ví dụ: `GetTripRequest`, `HoldSeatResponse`). Tất cả các service ở nhóm A và `api-gateway` đều tham chiếu chung về thư mục này. Nó đảm bảo rằng `booking-service` và `seat-service` nói chung một ngôn ngữ, nếu một bên gửi thiếu trường dữ liệu, hệ thống gRPC sẽ báo lỗi ngay từ lúc lập trình.

### 4. Thư mục `infrastructure/` (Phòng Kỹ thuật Hạ tầng)
- **Định nghĩa**: Chứa các file cấu hình cho các hệ thống phần mềm dùng chung.
- **Cách vận hành**:
  - `init-db/`: Chứa các file `.sql`. Khi chạy Docker lần đầu, PostgreSQL sẽ tự động múc các file này ra chạy để tạo 5-6 cái Database rỗng tương ứng cho các service.
  - `nginx/`: Cấu hình Nginx làm load balancer. Ví dụ: Nếu `trip-service` quá tải và bạn chạy 3 bản sao của nó, Nginx sẽ đứng giữa chia đều lượng request từ Gateway xuống 3 bản sao này.

### 5. Thư mục `packages/` (Kho công cụ dùng chung)
- **Định nghĩa**: Để tránh việc copy-paste code nhiều lần.
- **Cách vận hành**: Giả sử bạn có một logic mã hóa token JWT, một hàm log lỗi ra màn hình chuẩn định dạng, hoặc các định nghĩa về cấu trúc Event cho RabbitMQ. Thay vì viết lại ở 10 service khác nhau, bạn viết ở đây. Các service bên trong thư mục `services/` sẽ "import" bộ công cụ này vào để dùng chung.

### 6. Các file cấu hình gốc (`docker-compose.yml` & `package.json`)
- `package.json`: Định nghĩa kiến trúc Monorepo (Workspaces). Khi bạn gõ `npm install` ở thư mục ngoài cùng, nó sẽ tự động chạy vào từng service bên trong cài đúng thư viện cho từng thằng. Khi bạn gõ `npm run dev`, nó sẽ bật đồng loạt Gateway, các Services và các Workers lên.
- `docker-compose.yml`: Kịch bản chạy hạ tầng. Chỉ với một lệnh `docker compose up -d`, nó sẽ tự động kéo Postgres, Redis, RabbitMQ, Kafka và Zookeeper về máy bạn, cài đặt và nối mạng chúng lại với nhau để các code Node.js của bạn có thể kết nối vào sử dụng.
