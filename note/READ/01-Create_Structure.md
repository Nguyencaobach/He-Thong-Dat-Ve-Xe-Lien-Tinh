# Định nghĩa cấu trúc cho hệ thống
```text
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
```

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

> **💡 Tại sao Worker/Consumer không có URL trong file `.env` của API Gateway?**
>
> Vì `api-gateway` **không bao giờ chủ động gọi** vào các Worker này. Thay vào đó, luồng hoạt động như sau:
>
> ```
> Khách thanh toán xong
>         ↓
> booking-service ném message "booking.paid" vào RabbitMQ → Trả kết quả cho khách ngay ✅
>         ↓ (song song, ngầm phía sau — không chờ)
> ticket-worker        tự thức dậy → Sinh vé PDF
> notification-worker  tự thức dậy → Gửi email
> ```
>
> Nhờ cơ chế **bất đồng bộ** này, khách hàng nhận phản hồi "Đặt vé thành công" gần như tức thì mà không phải chờ hệ thống sinh vé hay gửi email mới xong. Worker tự kích hoạt khi có tin nhắn trong queue — không cần ai gọi, không cần URL, không cần địa chỉ gRPC.

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


# Cấu trúc file

Dưới đây là chi tiết các file cần thiết lập cho hệ thống Đặt vé xe khách, áp dụng theo chuẩn kiến trúc Microservices phân lớp (Layered Architecture, gRPC, RabbitMQ/Kafka, Outbox Pattern).

### 1. API Gateway (GraphQL Server)
Đóng vai trò làm "Lễ tân trung tâm", nhận request GraphQL từ Frontend Web/App và gọi xuống gRPC nội bộ.
```text
bus-booking-microservices/api-gateway/
├── .env
├── package.json
└── src/
    ├── grpcClients.js            # Khởi tạo các gRPC client (trip, seat, booking...)
    ├── pubsub.js                 # Quản lý kênh Pub/Sub cho GraphQL Subscriptions
    ├── resolvers.js              # Xử lý Logic điều hướng GraphQL -> gRPC
    ├── schema.js                 # Định nghĩa GraphQL TypeDefs (Queries, Mutations, Subscriptions)
    ├── seatEventsConsumer.js     # Lắng nghe message cập nhật trạng thái ghế real-time
    ├── authService.js            # Logic mã hóa/giải mã JWT, xác thực User
    ├── authRepository.js         # Truy vấn DB (Postgres) lấy thông tin user/phân quyền
    ├── db.js                     # Khởi tạo kết nối DB cho riêng Gateway
    └── server.js                 # Chạy Apollo GraphQL Server
```

### 2. Thư mục `services/` (Các Microservices Lõi)

#### A. `trip-service` (Quản lý tuyến, chuyến xe và tìm kiếm)
```text
bus-booking-microservices/services/trip-service/
├── .env
├── knexfile.js
├── package.json
├── db/
│   ├── migrations/
│   │   ├── 20261010000000_create_routes_table.js
│   │   ├── 20261010000001_create_trips_table.js
│   │   └── 20261010000002_create_outbox_events.js
│   └── seeds/
│       └── 01_initial_routes_trips.js
└── src/
    ├── db.js                     # Khởi tạo kết nối Postgres (Knex)
    ├── health.js                 # API Check health
    ├── tripCache.js              # Logic lưu/đọc Cache từ Redis cho Search API
    ├── tripGrpcHandlers.js       # Hứng request gRPC từ Gateway
    ├── tripRepository.js         # Truy vấn DB (Knex) cho Chuyến (Trip)
    ├── tripService.js            # Logic nghiệp vụ tìm chuyến, gợi ý chuyến
    ├── routeRepository.js        # Truy vấn DB cho Tuyến (Route)
    ├── routeService.js           # Logic quản lý Autocomplete Tuyến và Bến xe
    ├── outboxEventRepository.js  # Lưu event vào bảng outbox
    ├── outboxWorker.js           # Worker quét bảng outbox gửi lên RabbitMQ/Kafka
    ├── kafkaPublisher.js         # Publish luồng sự kiện (search-events) lên Kafka
    ├── rabbitmqPublisher.js      # Kết nối và gửi message lên RabbitMQ
    └── server.js                 # Khởi chạy gRPC server
```

#### B. `seat-service` (Quản lý kho ghế - Single Source of Truth)
*Lưu ý: Service này thao tác cường độ cao với Redis cho cơ chế giữ ghế (TTL).*
```text
bus-booking-microservices/services/seat-service/
├── .env
├── package.json
└── src/
    ├── health.js
    ├── redisPubSub.js            # Kênh Real-time phát sự kiện trạng thái ghế cho Gateway
    ├── rabbitmqPublisher.js      # Publish sự kiện khi ghế bị khóa/hết hạn
    ├── seatGrpcHandlers.js       # Xử lý gRPC requests liên quan đến ghế
    ├── seatRepository.js         # Giao tiếp với Redis (SETNX, TTL) và Postgres (nếu cần)
    ├── seatService.js            # Xử lý logic tranh chấp ghế
    └── server.js
```

#### C. `booking-service` (Kẻ điều phối - Saga Orchestrator)
```text
bus-booking-microservices/services/booking-service/
├── .env
├── knexfile.js
├── package.json
├── db/
│   ├── migrations/
│   │   ├── 20261010100000_create_bookings_table.js
│   │   └── 20261010100001_create_outbox_events.js
│   └── seeds/
└── src/
    ├── bookingGrpcHandlers.js    # Nhận lệnh tạo booking từ Gateway
    ├── bookingRepository.js      # Ghi nhận trạng thái booking vào DB
    ├── bookingService.js         # State machine điều phối (DRAFT -> PENDING -> PAID)
    ├── db.js
    ├── grpcClients.js            # Gọi ngược lại seat/payment service (Saga)
    ├── outboxEventRepository.js
    ├── outboxWorker.js
    ├── paymentEventConsumer.js   # Lắng nghe kết quả từ payment-service
    ├── kafkaPublisher.js         # Publish sự kiện phân tích (booking-events) lên Kafka
    ├── rabbitmqPublisher.js      # Publish trạng thái nghiệp vụ (booking.paid) lên RabbitMQ
    ├── health.js
    └── server.js
```

#### D. Các Workers chạy nền (Ticket & Notification)
Không có gRPC server, chỉ nằm chờ message từ RabbitMQ.
```text
bus-booking-microservices/services/ticket-worker/
├── .env
├── package.json
└── src/
    ├── bookingPaidConsumer.js    # Bắt event booking.paid từ RabbitMQ
    ├── ticketGenerator.js        # Logic sinh file vé PDF/HTML, mã QR
    ├── health.js
    └── server.js

bus-booking-microservices/services/notification-worker/
├── .env
├── package.json
└── src/
    ├── ticketIssuedConsumer.js   # Bắt event sinh vé thành công
    ├── emailSender.js            # Giả lập gửi email cho khách hàng
    ├── health.js
    └── server.js
```

#### E. `payment-service` & `admin-service`
```text
bus-booking-microservices/services/payment-service/
├── .env
├── knexfile.js
├── package.json
├── db/
│   ├── migrations/
│   └── seeds/
└── src/
    ├── paymentGrpcHandlers.js
    ├── paymentRepository.js
    ├── paymentService.js         # Giả lập thanh toán
    ├── outboxEventRepository.js
    ├── outboxWorker.js
    ├── kafkaPublisher.js         # Publish sự kiện (payment-events) lên Kafka
    ├── rabbitmqPublisher.js      # Publish kết quả thanh toán lên RabbitMQ (Saga)
    ├── db.js
    ├── health.js
    └── server.js

bus-booking-microservices/services/admin-service/
├── .env
├── knexfile.js
├── package.json
├── db/
│   ├── migrations/
│   └── seeds/
└── src/
    ├── adminGrpcHandlers.js      # Phục vụ CRUD từ Gateway
    ├── checkinService.js         # Dành cho Staff check-in mã vé/booking
    ├── dashboardService.js       # Logic gọi thống kê phục vụ màn hình Admin
    ├── adminRepository.js
    ├── adminService.js
    ├── outboxEventRepository.js
    ├── outboxWorker.js
    ├── rabbitmqPublisher.js      
    ├── db.js
    ├── health.js
    └── server.js
```

#### F. Nhóm AI, Phân tích & Tích hợp (Module 5)
```text
bus-booking-microservices/services/analytics-consumer/
├── .env
├── package.json
└── src/
    ├── searchEventConsumer.js    # Bắt Kafka event search
    ├── bookingEventConsumer.js   # Bắt Kafka event booking
    ├── analyticsRepository.js    # Lưu trữ vào DB phục vụ report
    ├── db.js
    ├── health.js
    └── server.js

bus-booking-microservices/services/chatbot-service/
├── .env
├── package.json
└── src/
    ├── chatbotGrpcHandlers.js    # Hứng request trò chuyện
    ├── aiSdk.js                  # Cấu hình AI Provider (OpenAI/Anthropic)
    ├── toolCalling.js            # Khai báo các tool (tìm chuyến) cho AI
    ├── rag.js                    # Đọc tài liệu chính sách
    ├── health.js
    └── server.js

bus-booking-microservices/services/mcp-server/
├── .env
├── package.json
└── src/
    ├── tools.js                  # Định nghĩa mcp tools (search_trips...)
    ├── resources.js              # Cung cấp policy tài liệu
    ├── index.js                  # Khởi chạy MCP Server Stdout/SSE
    └── package.json
```

### 3. Thư mục chia sẻ (`protos` và `packages`)

```text
bus-booking-microservices/
├── protos/                       # Các file hợp đồng giao tiếp gRPC
│   ├── admin.proto
│   ├── booking.proto
│   ├── payment.proto
│   ├── seat.proto
│   └── trip.proto
│
├── packages/                     # Thư mục chứa code dùng chung (Workspaces)
│   ├── common-utils/
│   │   ├── logger.js
│   │   └── errorHandler.js
│   └── event-schemas/
│       ├── bookingEvents.json    # Schema cho event trên RabbitMQ
│       ├── searchEvents.json     # Schema cho event trên Kafka
│       └── paymentEvents.json    # Schema cho event thanh toán
```

### 4. Thư mục cấu hình Hạ tầng (`infrastructure`)
```text
bus-booking-microservices/infrastructure/
├── init-db/
│   ├── 01_init_trip_db.sql       # Script tạo DB cho trip-service
│   ├── 02_init_booking_db.sql    # Script tạo DB cho booking-service
│   ├── 03_init_admin_db.sql      # Script tạo DB cho admin-service
│   ├── 04_init_analytics_db.sql  # Script tạo DB OLAP cho báo cáo thống kê
│   ├── 05_init_payment_db.sql    # Script tạo DB cho payment-service
│   └── 06_init_gateway_db.sql    # Script tạo DB quản lý tài khoản Users cho API Gateway
├── nginx/
│   └── nginx.conf                # Load balancing / Reverse Proxy gRPC
└── docker-compose.yml            # Chạy toàn bộ Postgres, Redis, RabbitMQ, Kafka
```

# Công nghệ sử dụng cho chức năng

Trong Microservices, nguyên tắc tối thượng là: **"Thằng nào cần dùng gì thì mới cài cái đó"**. Vì vậy cấu trúc file của các service không hề giống nhau. Dưới đây là phân loại chi tiết:

### 1. Outbox Pattern
**Không có tên trong bảng công nghệ cốt lõi, nhưng BẮT BUỘC phải có.**
- **Vì sao?** Để đảm bảo RabbitMQ và Kafka không bị rớt mất tin nhắn khi mạng chập chờn, hoặc khi database lưu thành công nhưng đẩy event bị lỗi. Hệ thống áp dụng theo đặc tả "Event-driven cho các tác vụ không đồng bộ... đảm bảo tính nhất quán (Saga pattern)".
- **Triển khai:** Được cấu thành từ chính **Postgres (DB)** (bảng `outbox_events`) và **NodeJS (Worker)** (`outboxWorker.js`) chứ không phải cài thêm phần mềm mới.

### 2. Sự khác biệt giữa các nhóm Service

#### Nhóm 1: "Lễ tân kiêm Bảo vệ" - `api-gateway`
- **Công nghệ sài:** GraphQL, Redis (Pub/Sub để real-time), gRPC Client, **PostgreSQL (DB Users)**.
- **Công nghệ KHÔNG sài:** Kafka, RabbitMQ, Outbox.
- **Lý do:** Nó làm nhiệm vụ nhận request GraphQL từ Web, xác thực Token JWT (đóng vai trò Auth Service), gọi gRPC Client nhờ các service khác xử lý. Nó sử dụng Database riêng để lưu bảng `Users` và cấp quyền cho khách hàng/Admin.

#### Nhóm 2: "Các phòng ban xử lý nghiệp vụ cốt lõi" (`trip`, `booking`, `payment`, `admin`)
- **Công nghệ sài:** gRPC Server, PostgreSQL (Knex), RabbitMQ/Kafka, **Outbox Pattern**.
- **Lý do:** Đây là trái tim của hệ thống. Khách gọi vào nó phải hứng (có `*GrpcHandlers.js`), lưu DB (có `knexfile.js`, `db/migrations`), rồi phát thông báo cho các bộ phận khác (có `outboxWorker.js`, `kafkaPublisher.js`, `rabbitmqPublisher.js`).

#### Nhóm 3: "Kho ghế siêu tốc" - `seat-service`
- **Công nghệ sài:** gRPC Server, **Redis** (dùng làm DB chính), Redis Pub/Sub.
- **Công nghệ KHÔNG sài:** Postgres, Outbox, Kafka.
- **Lý do:** Đặc tả yêu cầu *"Giữ ghế phải phản hồi dưới 1 giây"*. Do đó service này dùng **Redis** làm kho lưu trữ chính. Nó không xài Postgres nên không có `knexfile.js` hay `outboxWorker.js`. Khi có ghế đổi màu, nó báo thẳng qua `redisPubSub.js`.

#### Nhóm 4: "Công nhân làm việc thầm lặng" (`ticket-worker`, `notification-worker`, `analytics-consumer`)
- **Công nghệ sài:** RabbitMQ Consumer, Kafka Consumer.
- **Công nghệ KHÔNG sài:** gRPC Server, GraphQL.
- **Lý do:** Không ai gọi trực tiếp các worker này. Chúng chỉ âm thầm lắng nghe message. Vì không ai gọi nên không có `*GrpcHandlers.js`. Worker sinh vé/email không cần lưu trữ dài hạn nên không có DB. Riêng `analytics-consumer` nghe Kafka xong phải lưu lại nên có DB riêng (`analyticsRepository.js`).

#### Nhóm 5: "AI thông minh" (`chatbot-service`, `mcp-server`)
- **Công nghệ sài:** AI SDK, MCP Protocol, gRPC/GraphQL Client.
- **Lý do:** Thuần túy làm logic kết nối với API của OpenAI/Claude (`aiSdk.js`, `tools.js`). Không giữ dữ liệu nội tại hệ thống nên không có DB hay Outbox.

### 3. Giải thích các công nghệ cốt lõi
Dưới đây là ý nghĩa và ví dụ thực tế cho từng công nghệ được chọn trong dự án:

- **RabbitMQ (Dùng cho Nghiệp vụ quan trọng):** Giống như một "Bưu điện". Khi khách thanh toán xong, hệ thống ném một tin nhắn "đã thanh toán" vào Bưu điện. Bưu điện giữ an toàn lá thư này và đảm bảo giao tận tay cho bộ phận Sinh vé và Gửi email. Nhờ vậy, khách không phải chờ xoay vòng vòng trên web. Nếu hệ thống email bị sập, RabbitMQ vẫn giữ khư khư tin nhắn đó chờ đến khi mạng có lại mới gửi tiếp (an toàn tuyệt đối, không bao giờ mất vé).
- **Kafka (Dùng cho Dữ liệu lớn/Thống kê):** Giống như "Đài phát thanh". Nó phát ra hàng triệu sự kiện (như "Ai đó vừa bấm tìm vé", "Ai đó vừa click xem sơ đồ ghế"). Bộ phận Phân tích (Analytics) mở đài lên nghe để vẽ biểu đồ doanh thu. Nếu lỡ rớt mạng mất một vài sự kiện thì cũng không làm sập chức năng mua vé chính của khách (tốc độ cao, tách biệt khỏi luồng chính).
- **NextJS:** Công nghệ làm giao diện Web (Frontend). Giúp trang web load nhanh và đặc biệt là chuẩn SEO để Google dễ dàng quét được các trang như "Vé xe Sài Gòn đi Đà Lạt".
- **GraphQL:** Lớp vỏ bảo vệ bên ngoài (API Gateway). Frontend chỉ cần gọi đúng một địa chỉ GraphQL này và đòi "Tôi muốn lấy thông tin vé và giá vé", GraphQL sẽ tự động đi vào bên trong, nhặt dữ liệu từ các service khác nhau rồi gộp lại trả cho Frontend một lần duy nhất.
- **gRPC:** Ngôn ngữ giao tiếp nội bộ siêu tốc. Các phòng ban (services) bên trong hệ thống nói chuyện với nhau bằng gRPC thay vì API bình thường (REST) để đảm bảo tốc độ cực nhanh và dữ liệu cực kỳ khắt khe (strict schema - gửi thiếu dữ liệu là báo lỗi ngay lúc code).
- **Redis:** Bộ nhớ đệm tốc độ ánh sáng. Khi khách bấm "Tìm chuyến", hệ thống không mò vào Database chậm chạp mà lôi thẳng kết quả từ Redis ra trả về trong 0.01 giây. Ngoài ra nó còn dùng để **giữ ghế tạm thời (TTL)**: khóa ghế 5 phút, hết giờ tự nhả.
- **Nginx:** Cảnh sát giao thông (Load Balancer). Nếu có 10.000 người cùng truy cập, Nginx đứng ngoài cùng sẽ chia đều lượng người này ra cho 3-4 bản sao của máy chủ để không máy nào bị quá tải.
- **AI SDK & MCP Server:** Cổng giao tiếp cho Trí tuệ nhân tạo. Giúp Chatbot có khả năng tự động vào Database tìm chuyến xe thật cho khách thay vì trả lời linh tinh (ảo giác). MCP Server giúp các con AI ở bên ngoài (như Claude trên máy tính anh) có thể thao tác thẳng vào hệ thống mà không cần mở trình duyệt Web.
- **Outbox Pattern:** Giống như "Cuốn sổ tay ghi nhớ" bảo hiểm. Thay vì lưu dữ liệu xong chạy ngay ra bưu điện (RabbitMQ) gửi thư (nếu giữa đường vấp ngã hoặc bưu điện đóng cửa thì mất thư), hệ thống sẽ chép lá thư đó vào cuốn sổ tay (Database) trước. Sau đó có một anh nhân viên cần mẫn (`outboxWorker`) cứ 1 giây lật sổ ra 1 lần, thấy thư nào chưa gửi thì đem ra bưu điện gửi, gửi thành công mới gạch bỏ. Nhờ vậy, dù mạng mẽo có đứt đoạn, thư vẫn nằm an toàn trong sổ, đảm bảo không bao giờ thất lạc dữ liệu.