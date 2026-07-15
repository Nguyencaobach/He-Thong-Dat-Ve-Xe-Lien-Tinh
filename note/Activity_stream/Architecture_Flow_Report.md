# BÁO CÁO CHUYÊN SÂU: LUỒNG XỬ LÝ KIẾN TRÚC MICROSERVICES & gRPC

Tài liệu này giải thích chi tiết cách hệ thống phân luồng request từ người dùng tại cổng `4000` xuống các service bên dưới, cũng như logic hoạt động chi tiết của từng service đã hoàn thiện.

---

## PHẦN 1: TẠI SAO CỔNG 4000 (API-GATEWAY) KHÔNG GỌI API NHƯ BÌNH THƯỜNG?

Trong các hệ thống truyền thống, khi Frontend gọi Backend, nó dùng **REST API** (ví dụ `axios.get('http://api/trips')`). Nếu Backend gọi một service khác, nó cũng dùng REST API (`fetch(...)`). Giao thức này dùng văn bản (JSON) qua HTTP/1.1, rất dễ đọc nhưng **rất chậm** và **nặng nề** khi các service phải gọi nhau liên tục hàng ngàn lần một giây.

Hệ thống của chúng ta sử dụng kiến trúc **gRPC (gRPC Remote Procedure Calls)** để các service giao tiếp với nhau.

### 1. Cơ chế hoạt động của gRPC
1. **Proto Buffers (`.proto`)**: Thay vì dùng JSON, chúng ta định nghĩa trước một file hợp đồng (`trip.proto`, `booking.proto`). File này quy định rõ cấu trúc dữ liệu đầu vào và đầu ra. Dữ liệu khi gửi đi sẽ được biên dịch (compile) thành dạng nhị phân (binary 0 và 1) cực kỳ nhỏ gọn.
2. **HTTP/2**: gRPC chạy trên nền HTTP/2, cho phép duy trì một kết nối vĩnh viễn (persistent connection) và gửi hàng loạt request trên cùng một đường ống, giảm độ trễ (latency) xuống mức mili-giây.
3. **Remote Procedure Call (Gọi hàm từ xa)**: Khi `api-gateway` muốn tìm chuyến xe, nó không gửi một request HTTP GET. Nó **gọi một hàm** (ví dụ: `tripClient.SearchTrips(data)`). Đối với lập trình viên, nó trông giống hệt như đang gọi một hàm JavaScript bình thường nằm trong cùng một file, nhưng thực chất gRPC đã tự động đóng gói tham số, bắn qua mạng bằng nhị phân tới cổng `50051`, `trip-service` tính toán xong bắn nhị phân trả lại, và gRPC tự động giải mã thành Object cho bạn.

### 2. Luồng đi của 1 Request cụ thể từ Frontend
Giả sử người dùng mở web và tìm chuyến xe từ "Sài Gòn" đi "Đà Lạt":
1. Frontend gửi một **GraphQL Query** đến `http://localhost:4000/graphql` (Cổng của API Gateway).
2. Tại `api-gateway` (file `resolvers.js`), nó bắt được Query tên là `searchTrips`. Nó sẽ lấy tham số từ Frontend (departure: "Sài Gòn",...).
3. Gateway KHÔNG tự xử lý. Nó sử dụng một biến tên là `tripClient` (được cấu hình sẵn để trỏ tới `localhost:50051`).
4. Gateway gọi lệnh: `const result = await tripClient.SearchTrips({ departure, destination })`.
5. Thông qua gRPC, request này lao thẳng đến cổng `50051`.
6. `trip-service` (đang lắng nghe ở 50051) nhận được, nó kết nối Database (`trip_db`), truy vấn bằng SQL (Knex), lấy ra kết quả, và return.
7. Kết quả nhị phân bay ngược về cổng 4000. Gateway giải mã, biến thành JSON và trả về cho Frontend hiển thị.

---

## PHẦN 2: CHI TIẾT LOGIC TỪNG SERVICE ĐÃ HOÀN THIỆN

Dưới đây là luồng xử lý chi tiết (File nào gọi file nào, xử lý ra sao) của từng service.

### 1. `trip-service` (Cổng 50051 - Quản lý Chuyến xe)
- **Công nghệ:** Node.js, gRPC Server, PostgreSQL, Knex.
- **Nhiệm vụ:** Quản lý Tuyến đường (Route) và Chuyến xe (Trip).
- **Luồng xử lý:**
  - `server.js`: Khởi tạo gRPC Server, gắn các handler từ `grpcHandlers.js`.
  - Khi có request `SearchTrips`, `grpcHandlers.js` gọi xuống tầng nghiệp vụ `tripService.js`.
  - `tripService.js` kiểm tra logic, rồi gọi xuống tầng dữ liệu `tripRepository.js`.
  - `tripRepository.js` dùng Knex để Query vào `trip_db` Postgres, tìm các chuyến xe thỏa mãn điều kiện.
  - Ngoài ra, `tripService.js` còn gọi `kafkaPublisher.js` để đẩy một sự kiện `"search-events"` lên Kafka (phục vụ cho Analytics Consumer sau này đếm số lượt tìm kiếm).

### 2. `seat-service` (Cổng 50052 - Inventory & Giữ ghế)
- **Công nghệ:** Node.js, gRPC Server, Redis (In-memory DB).
- **Nhiệm vụ:** Xử lý việc hành khách click chọn ghế và giữ chỗ tạm thời (5 phút). Tránh việc 2 người cùng mua 1 ghế.
- **Luồng xử lý:**
  - Không dùng Database truyền thống (Postgres) vì quá chậm để xử lý tranh chấp vé. Sử dụng Redis.
  - `seatService.js`: Khi nhận lệnh `HoldSeat`, nó gọi hàm Redis `SETNX` (Set if Not Exists). Nếu ghế trống, nó set trạng thái ghế thành `HELD` kèm theo User ID và TTL (Time-to-live) là 5 phút. Nếu người khác bấm vào đúng ghế đó sau 1 mili-giây, `SETNX` sẽ thất bại và báo lỗi "Ghế đã có người giữ".
  - Bắn sự kiện lên Redis Pub/Sub để API-Gateway đẩy qua WebSocket, làm màn hình của tất cả người dùng khác nháy đỏ cái ghế đó ngay lập tức.

### 3. `booking-service` (Cổng 50053 - Quản lý Đơn hàng)
- **Công nghệ:** Node.js, gRPC Server, PostgreSQL.
- **Nhiệm vụ:** Lưu trữ thông tin khách hàng, số ghế đã chọn, tạo đơn hàng trạng thái PENDING.
- **Luồng xử lý:**
  - Nhận lệnh `CreateBooking`, nó gọi sang `seat-service` để kiểm tra xem những ghế này CÓ ĐÚNG là đang được giữ bởi User này hay không.
  - Nếu hợp lệ, lưu vào `booking_db` (bảng `bookings` và `passengers`).
  - Khi thanh toán thành công (được gọi từ payment-service), nó đổi trạng thái sang `PAID`, gọi `seat-service` chốt ghế vĩnh viễn (`BOOKED`), và thả một event `booking.paid` vào Outbox/RabbitMQ để sinh vé.

### 4. `payment-service` (Cổng 50054 - Thanh toán)
- **Công nghệ:** Node.js, gRPC Server, PostgreSQL, RabbitMQ, Kafka.
- **Luồng xử lý:**
  - Cung cấp API giả lập quá trình móc nối với Momo/VNPay.
  - Khi thanh toán thành công, lưu transaction vào DB.
  - Giao tiếp với `booking-service`: Đẩy một Event `payment.success` vào RabbitMQ, `booking-service` (đóng vai trò Consumer) nghe thấy và tự động cập nhật vé thành PAID. Không gọi gRPC trực tiếp để tránh thắt cổ chai.
  - Bắn sự kiện lên Kafka `payment-events` để báo cáo doanh thu.

### 5. `ticket-worker` & `notification-worker` (Không có port)
- **Công nghệ:** Node.js thuần, RabbitMQ, PDF Generator, Nodemailer.
- **Luồng xử lý BẤT ĐỒNG BỘ:**
  - Đây là các ứng dụng "chạy ngầm" không phơi bày cổng API nào cả. Chúng duy trì kết nối liên tục với RabbitMQ.
  - `ticket-worker`: Thấy có tin `booking.paid`, nó lấy thông tin ra, dùng thư viện sinh ra 1 file vé (PDF/HTML có mã QR), lưu file lại. Làm xong, nó vứt tiếp 1 tin `ticket.issued` lên RabbitMQ.
  - `notification-worker`: Thấy tin `ticket.issued`, nó móc file PDF ra, soạn 1 email đẹp đẽ và gửi cho khách hàng.
  - Nhờ 2 worker này, luồng thanh toán của khách hàng kết thúc trong 1 giây mà không phải chờ quá trình sinh PDF và gửi Email (thường tốn 5-10 giây).

### 6. `admin-service` (Cổng 50055 - Quản trị hệ thống)
- **Công nghệ:** Node.js, gRPC Server, Postgres.
- **Nhiệm vụ:** Quản lý xe (Bus), cấu hình sơ đồ ghế, khóa ghế (Block).
- **Luồng xử lý:**
  - Lưu trữ thông tin xe trong `admin_db`.
  - Có chức năng cực mạnh: Gọi `seat-service` ép khóa (Block) những ghế bị hỏng hoặc dành riêng cho người nhà, khiến khách ngoài không thể đặt được.

### 7. `analytics-service` (Cổng 50056 - Phân tích dữ liệu)
- **Công nghệ:** Node.js, gRPC Server, Kafka Consumer, Postgres.
- **Luồng xử lý:**
  - Hoạt động như một "kẻ nghe lén" tinh vi. Liên tục nghe ngóng `search-events` và `payment-events` từ Kafka.
  - Nhặt dữ liệu về, tính toán cộng dồn (Tổng lượt tìm kiếm hôm nay, Tổng doanh thu hôm nay) và lưu siêu nhanh vào `analytics_db`.
  - Mở cổng gRPC `GetDashboardStats` để `admin-service` gọi sang lấy số liệu vẽ lên màn hình Dashboard cho Giám đốc.

### 8. `chatbot-service` (Cổng 4001 - Trí tuệ Nhân tạo & WebAI)
- **Công nghệ:** Node.js, Express (HTTP), Vercel AI SDK, RAG, gRPC Clients.
- **Luồng xử lý:**
  - Đây là service duy nhất ngoài Gateway mở cổng HTTP vì nó phải trả dữ liệu dạng *Streaming* (chữ hiện ra từ từ như ChatGPT) trực tiếp cho Frontend.
  - Ứng dụng **RAG**: Khi khách hỏi "Lỡ vé có được hoàn tiền không?", nó biến câu hỏi thành Vector, tìm trong file `policy.txt` đoạn quy định hoàn tiền, nhét vào Prompt cho con AI (Gemini).
  - Ứng dụng **Tool Calling**: Khách hỏi "Tìm xe đi Đà Lạt ngày mai". AI không tự trả lời, mà nó thông báo cho server: "Ê, gọi giùm hàm `searchTrips` với tham số này". Server tự động dùng `tripClient` (gRPC) gọi thẳng vào lõi hệ thống (`trip-service`), lấy lịch trình xe thật, rồi đút lại cho AI để AI thông báo cho khách.
  - **Bảo mật tuyệt đối:** Nó hoạt động như một "Client thông minh". Nó không được phép chạm vào DB. Mọi thông tin nó lấy đều phải đi ngang qua gRPC của hệ thống lõi.
