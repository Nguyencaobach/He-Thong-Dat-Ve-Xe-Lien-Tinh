# ĐẶC TẢ CHI TIẾT DỰ ÁN
## Hệ thống đặt vé xe khách liên tỉnh tích hợp AI

---

## 1. Tổng quan dự án

### 1.1. Mục tiêu
Xây dựng một hệ thống web đặt vé xe khách liên tỉnh theo mô hình **microservices**, cho phép:
- Người dùng tìm kiếm, chọn ghế, đặt vé và thanh toán mô phỏng.
- Admin quản lý toàn bộ vận hành: tuyến, xe, chuyến, booking, check-in, doanh thu.
- Tích hợp **Chatbot AI** hỗ trợ tra cứu và tư vấn.
- Cung cấp **MCP Server** để các AI client bên ngoài (Claude Desktop, Claude Code, các agent khác...) có thể gọi trực tiếp các tool nghiệp vụ (tìm chuyến, tra cứu booking...) mà không cần qua giao diện web.

### 1.2. Yêu cầu công nghệ bắt buộc
| Thành phần | Vai trò trong hệ thống |
|---|---|
| NextJS | Frontend (SSR/SSG cho SEO) + có thể làm BFF nhẹ |
| GraphQL | Lớp API Gateway hợp nhất, phục vụ frontend |
| gRPC | Giao tiếp nội bộ giữa các microservice (hiệu năng cao, strict schema) |
| Microservices | Tách biệt theo domain: Search, Seat Inventory, Booking, Payment, Ticket, Notification, Analytics, Admin, Chatbot, MCP |
| RabbitMQ/Kafka | Kafka cho luồng sự kiện phân tích (search-events, booking-events, payment-events); RabbitMQ cho luồng nghiệp vụ cần xử lý tuần tự, đáng tin cậy (booking.paid → sinh vé, gửi email) |
| Redis | Cache kết quả tìm kiếm, giữ ghế tạm thời (TTL), pub/sub cho realtime seat update |
| Nginx | Reverse proxy / API gateway ở tầng hạ tầng, load balancing, TLS termination |
| AI SDK | Xây dựng chatbot (function calling / tool calling vào các service nghiệp vụ) |
| MCP Server | Expose tool và resource cho AI client bên ngoài |

### 1.3. Nguyên tắc kiến trúc tổng thể
- **Single source of truth cho trạng thái ghế**: chỉ Seat Inventory Service được ghi/đọc trạng thái ghế, các service khác gọi qua gRPC, không truy cập trực tiếp dữ liệu ghế của nhau.
- **Event-driven cho các tác vụ không đồng bộ**: sinh vé, gửi email, ghi analytics đều xử lý qua message broker, không chặn luồng phản hồi cho người dùng.
- **GraphQL Gateway là điểm vào duy nhất cho frontend**, ẩn hoàn toàn chi tiết microservices/gRPC phía sau.
- **Idempotency**: các thao tác quan trọng (giữ ghế, xác nhận thanh toán, sinh vé) cần có cơ chế chống xử lý trùng lặp (idempotency key).

---

## 2. Vai trò người dùng (Actors)

| Vai trò | Quyền hạn chính |
|---|---|
| Guest Customer | Tìm chuyến, chọn ghế, đặt vé, thanh toán mô phỏng, nhận vé qua email — không cần tài khoản |
| Registered Customer | Như Guest + lưu hành khách thường dùng, xem lịch sử, hủy vé theo chính sách |
| Admin | Toàn quyền CRUD tuyến/xe/chuyến, xem booking, check-in, xem báo cáo doanh thu |
| Check-in Staff | Vai trò con của Admin, chỉ tra cứu vé bằng mã booking/QR và đánh dấu đã lên xe |

Phân quyền nên triển khai theo mô hình **RBAC (Role-Based Access Control)** đơn giản với 3 role hệ thống: `ADMIN`, `STAFF`, `CUSTOMER`; Guest được xem như một phiên không có `userId` gắn kèm.

---

## 3. Kiến trúc microservices đề xuất

| Service | Trách nhiệm chính | Giao tiếp |
|---|---|---|
| GraphQL Gateway | Hợp nhất API, xác thực, định tuyến request tới các service qua gRPC | Nhận GraphQL, gọi gRPC |
| Trip/Search Service | Quản lý tuyến, chuyến, tìm kiếm, autocomplete, cache kết quả | gRPC, đọc/ghi Redis cache |
| Seat Inventory Service | Sơ đồ ghế, trạng thái ghế, giữ ghế TTL trong Redis | gRPC |
| Booking Service | Quản lý vòng đời booking (state machine), điều phối giữ ghế/thanh toán/vé | gRPC, publish Kafka/RabbitMQ |
| Payment Service (mô phỏng) | Giả lập xử lý thanh toán, phát sự kiện kết quả | gRPC, publish RabbitMQ |
| Ticket Worker | Lắng nghe `booking.paid`, sinh vé điện tử (HTML/PDF) | Consume RabbitMQ |
| Notification/Email Worker | Lắng nghe sự kiện, gửi email mô phỏng hoặc ghi log | Consume RabbitMQ |
| Analytics Consumer | Đọc các Kafka topic, tổng hợp dữ liệu báo cáo | Consume Kafka |
| Admin Service | Nghiệp vụ quản trị: CRUD tuyến/xe/chuyến, dashboard | gRPC |
| Chatbot Service | Tầng AI, gọi các tool nội bộ qua GraphQL/gRPC | AI SDK, gọi GraphQL nội bộ |
| MCP Server | Expose các tool/resource nghiệp vụ cho AI client ngoài | Gọi lại GraphQL Gateway hoặc gRPC nội bộ |

**Lưu ý triển khai**: Chatbot Service và MCP Server nên tái sử dụng cùng một tầng "tool nghiệp vụ" (ví dụ cùng gọi vào GraphQL Gateway hoặc một lớp Service Facade), tránh viết logic nghiệp vụ trùng lặp ở hai nơi.

---

## 4. Module 1 — Tìm kiếm Chuyến đi & Danh mục Dịch vụ

### 4.1. Mục tiêu
Người dùng tìm được chuyến phù hợp nhanh; trang tuyến xe được tối ưu SEO.

### 4.2. Yêu cầu chức năng chi tiết
1. Form tìm kiếm gồm: điểm đi, điểm đến, ngày đi.
2. Autocomplete tỉnh/thành và bến xe (gợi ý: TP.HCM, Đà Lạt, Nha Trang, Cần Thơ, Đà Nẵng, Hà Nội; bến: Miền Đông, Miền Tây, Liên tỉnh Đà Lạt, Nha Trang phía Nam).
3. Danh sách kết quả hiển thị: giờ đi, giờ đến dự kiến, nhà xe, loại xe, giá, số ghế còn lại.
4. Bộ lọc: khoảng giờ đi, khoảng giá, nhà xe, loại xe, số ghế trống tối thiểu.
5. Sắp xếp: giá thấp nhất, giờ đi sớm nhất, thời gian di chuyển ngắn nhất.
6. Trang chi tiết chuyến: điểm đón/trả, chính sách hủy vé, sơ đồ ghế.
7. Nếu không có chuyến đúng ngày, gợi ý ngày gần nhất có chuyến còn chỗ.

### 4.3. Cách thực hiện (lý thuyết)
- **Cache tìm kiếm**: Kết quả tìm kiếm theo cặp (điểm đi, điểm đến, ngày) được cache trong Redis với key dạng `search:{from}:{to}:{date}`, TTL ngắn (vài phút) vì số ghế thay đổi liên tục; nên tách phần "danh sách chuyến tĩnh" (cache lâu hơn) khỏi "số ghế còn trống" (luôn lấy real-time từ Seat Inventory Service) để tránh hiển thị sai lệch dữ liệu ghế.
- **Autocomplete**: dùng chỉ mục dạng prefix-search (ví dụ Redis Sorted Set hoặc bảng index riêng) để trả kết quả tức thời, không nên query full-text trên bảng chính.
- **SEO**: NextJS dùng SSR/ISR cho các trang tuyến phổ biến (ví dụ `/ve-xe/tphcm-di-da-lat`), sinh metadata động (title, description, canonical URL) theo cặp điểm đi/điểm đến/ngày.
- **Analytics tìm kiếm**: mỗi lượt tìm kiếm phát một sự kiện vào Kafka topic `search-events` (không đồng bộ, không ảnh hưởng độ trễ phản hồi người dùng), phục vụ cho việc tính "top tuyến được tìm kiếm nhiều" ở Module 5.
- **Gợi ý ngày gần nhất**: khi không có chuyến, Trip Service quét các ngày lân cận (±N ngày) tìm chuyến còn ghế trống và trả về gợi ý kèm số ghế còn lại.

---

## 5. Module 2 — Chọn Chỗ ngồi & Quản lý Kho chỗ theo Thời gian thực

### 5.1. Mục tiêu
Đảm bảo không có hai người đặt trùng cùng một ghế, trải nghiệm chọn ghế mượt và có phản hồi tức thời.

### 5.2. Trạng thái ghế (state machine)
| Trạng thái | Ý nghĩa |
|---|---|
| AVAILABLE | Ghế còn trống |
| HELD | Đang được giữ tạm thời bởi một phiên đặt vé |
| BOOKED | Đã thanh toán và xác nhận |
| BLOCKED | Bị khóa bởi admin (hỏng, không bán) |

Chuyển trạng thái hợp lệ: `AVAILABLE → HELD → BOOKED`, `HELD → AVAILABLE` (hết TTL hoặc hủy chủ động), `AVAILABLE ↔ BLOCKED` (do admin).

### 5.3. Yêu cầu chức năng chi tiết
1. Hiển thị sơ đồ ghế theo loại xe (ghế ngồi 29 chỗ, giường nằm 34 chỗ, limousine 22 chỗ).
2. Người dùng chọn một hoặc nhiều ghế.
3. Frontend gọi mutation `holdSeats` khi người dùng xác nhận chọn ghế.
4. Seat Inventory Service kiểm tra và ghi trạng thái giữ ghế.
5. Hiển thị đồng hồ đếm ngược thời gian giữ ghế cho người dùng.
6. Khi hết TTL, ghế tự động trở về AVAILABLE.
7. Các client khác đang xem cùng chuyến nhận cập nhật trạng thái ghế theo thời gian thực.
8. Có kịch bản kiểm thử hai người cùng chọn một ghế — chỉ một người thành công.

### 5.4. Cách thực hiện (lý thuyết)

**Luồng giữ ghế:**
1. Người dùng chọn ghế A01 trên giao diện.
2. NextJS gọi GraphQL mutation `holdSeats(tripId, seatIds)`.
3. GraphQL Gateway chuyển tiếp yêu cầu tới Booking Service.
4. Booking Service gọi gRPC `HoldSeats` tới Seat Inventory Service.
5. Seat Inventory Service thực hiện thao tác **ghi có điều kiện** trên Redis (dạng "SET nếu chưa tồn tại" — tương đương `SETNX`) cho key `hold:{tripId}:{seatId}` với TTL 5 phút, đảm bảo tính **atomic**: nếu hai request đến gần như đồng thời, chỉ một request ghi thành công.
6. Nếu ghi thành công, trả về "hold token" đại diện cho phiên giữ ghế; nếu thất bại (ghế đã HELD/BOOKED), trả lỗi rõ ràng để frontend thông báo cho người dùng chọn ghế khác.
7. Kết quả trả ngược qua Booking Service → GraphQL Gateway → Frontend.

**Đảm bảo tính đúng đắn khi tranh chấp (race condition):**
- Vì thao tác ghi trạng thái ghế được thực hiện atomic ở tầng Redis (một lệnh duy nhất, không tách thành "đọc rồi ghi"), hai yêu cầu giữ cùng một ghế tại cùng thời điểm sẽ luôn có đúng một yêu cầu thành công, bất kể thứ tự xử lý ở tầng ứng dụng.
- Seat Inventory Service nên là **service duy nhất** có quyền ghi trạng thái ghế, tránh tình trạng nhiều service cùng ghi gây xung đột dữ liệu.

**Cập nhật thời gian thực cho các client khác:**
- Khi trạng thái ghế thay đổi (HELD, hết hạn về AVAILABLE, hoặc BOOKED), Seat Inventory Service publish sự kiện nội bộ (qua Redis Pub/Sub hoặc một kênh nội bộ tương tự).
- GraphQL Gateway lắng nghe kênh này và đẩy cập nhật tới các client đang subscribe thông qua **GraphQL Subscription** theo `tripId`, để những người dùng khác đang xem cùng sơ đồ ghế thấy ghế chuyển màu ngay lập tức.

**Tự động giải phóng ghế hết hạn:**
- TTL của Redis tự động xóa key giữ ghế khi hết thời gian; hệ thống có thể dùng cơ chế lắng nghe sự kiện hết hạn (keyspace notification) để chủ động phát sự kiện "ghế đã được giải phóng" tới các client đang subscribe, thay vì chờ client tự poll.

**Kiểm thử tranh chấp đồng thời:**
- Viết kịch bản kiểm thử mô phỏng hai request `holdSeats` gửi gần như đồng thời cho cùng một ghế, xác nhận chỉ một request trả về thành công và request còn lại nhận lỗi "ghế đã được giữ".

---

## 6. Module 3 — Đặt vé, Giả lập Thanh toán, Vé & Thông báo

### 6.1. Mục tiêu
Hoàn thiện luồng từ chọn ghế đến nhận vé điện tử.

### 6.2. State machine của Booking
```
DRAFT -> PENDING_PAYMENT -> PAID -> TICKET_ISSUED -> CHECKED_IN -> COMPLETED
PENDING_PAYMENT -> EXPIRED
PAID -> CANCELLED
```
Mỗi lần chuyển trạng thái cần được ghi log (audit trail) kèm thời điểm và tác nhân gây ra thay đổi (người dùng, hệ thống, hay admin).

### 6.3. Yêu cầu chức năng chi tiết
1. Nhập thông tin hành khách (họ tên, số điện thoại, email, số giấy tờ tùy chọn) — mỗi ghế gắn với một hành khách.
2. Hỗ trợ guest checkout và registered checkout.
3. Tạo booking ở trạng thái PENDING_PAYMENT khi hoàn tất nhập thông tin.
4. Thanh toán mô phỏng bằng nút "Thanh toán thành công" / "Thanh toán thất bại".
5. Sau khi thanh toán thành công, Booking Service xác nhận ghế với Seat Inventory Service (chuyển HELD → BOOKED).
6. Publish sự kiện `booking.paid`.
7. Ticket Worker sinh vé điện tử; Email Worker gửi email mô phỏng/ghi log.
8. Trang xác nhận đặt vé; tra cứu vé bằng mã booking + email; registered user xem lịch sử booking.
9. Hủy booking khi đủ điều kiện chính sách; giải phóng ghế khi booking hết hạn thanh toán.

### 6.4. Cách thực hiện (lý thuyết)

**Điều phối giao dịch giữa các service (Saga pattern):**
Vì một lượt đặt vé chạm vào nhiều service (Booking, Seat Inventory, Payment, Ticket, Notification), hệ thống nên áp dụng mô hình **Saga dạng choreography** (điều phối qua sự kiện) thay vì transaction phân tán truyền thống:
- Booking Service đóng vai trò điều phối chính cho phần đồng bộ (tạo booking, gọi xác nhận ghế, gọi payment mô phỏng).
- Các bước "chậm"/không cần phản hồi ngay (sinh vé, gửi email, ghi analytics) được tách ra xử lý bất đồng bộ qua RabbitMQ, giúp người dùng nhận phản hồi "đặt vé thành công" nhanh mà không phải chờ toàn bộ chuỗi xử lý.
- Nếu một bước thất bại (ví dụ xác nhận ghế thất bại sau khi thanh toán "thành công" mô phỏng), cần có bước bù trừ (compensating action): hoàn trạng thái booking về lỗi và không sinh vé, đồng thời hiển thị thông báo phù hợp.

**Vì sao dùng RabbitMQ cho luồng này thay vì Kafka:**
- Luồng `booking.paid → sinh vé → gửi email` là luồng nghiệp vụ mang tính "công việc cần hoàn thành đúng một lần, đúng thứ tự trong phạm vi một booking", phù hợp với mô hình hàng đợi công việc (work queue) có xác nhận (ack/nack) của RabbitMQ.
- Kafka phù hợp hơn cho luồng dữ liệu dạng "stream sự kiện để nhiều consumer phân tích", như các topic `search-events`, `booking-events`, `payment-events` ở Module 5.

**Sinh vé điện tử:**
- Ticket Worker consume sự kiện `booking.paid`, với mỗi ghế trong booking sinh ra một vé chứa: mã booking, mã vé, họ tên hành khách, tuyến xe, điểm đón, điểm trả, ngày giờ khởi hành, số ghế, biển số/mã xe, mã QR mô phỏng (chuỗi dạng `bookingCode-ticketId`), và chính sách check-in.
- Vé xuất dưới dạng HTML render sẵn (có thể export PDF đơn giản), lưu trữ để tra cứu lại sau này qua mã booking + email.

**Hết hạn thanh toán:**
- Booking ở trạng thái PENDING_PAYMENT cần có thời hạn tương ứng với TTL giữ ghế; khi hết hạn mà chưa thanh toán, hệ thống tự động chuyển booking sang EXPIRED và đảm bảo ghế được giải phóng (đồng bộ với việc TTL Redis ở Module 2 hết hạn).

**Chính sách hủy vé:**
- Cần định nghĩa rõ điều kiện hủy (ví dụ: chỉ hủy được khi chuyến chưa khởi hành và trước giờ khởi hành tối thiểu N giờ), đây cũng là nội dung mà Chatbot AI sẽ tham chiếu khi trả lời câu hỏi về chính sách.

---

## 7. Module 4 — Trang quản trị & Vận hành Hệ thống

### 7.1. Mục tiêu
Cho phép Admin/Staff quản lý toàn bộ dữ liệu vận hành.

### 7.2. Yêu cầu chức năng chi tiết
1. Đăng nhập, phân quyền ADMIN / STAFF / CUSTOMER.
2. CRUD tuyến xe, điểm dừng, xe (bao gồm cấu hình sơ đồ ghế).
3. Tạo chuyến xe từ tuyến đã có, gán xe cho chuyến, cấu hình giá vé, giờ đi/đến dự kiến.
4. Kích hoạt/tạm khóa chuyến.
5. Xem danh sách booking theo chuyến.
6. Check-in hành khách bằng mã booking hoặc mã vé.
7. Đánh dấu chuyến DEPARTED, COMPLETED.
8. Khóa một số ghế không bán (BLOCKED).
9. Xem log các sự kiện chính: tạo chuyến, booking paid, check-in.

### 7.3. Cách thực hiện (lý thuyết)
- **Quan hệ dữ liệu**: Tuyến (Route) là thực thể gốc gồm điểm đi/đến và các điểm dừng; Chuyến (Trip) là một thực thể "diễn ra tại một thời điểm cụ thể" được tạo từ một Route + một Xe (Bus) + khung giờ + giá vé — tách biệt dữ liệu tĩnh (Route, Bus) khỏi dữ liệu theo thời gian (Trip) để dễ tái sử dụng khi tạo lịch chạy lặp lại.
- **Cấu hình sơ đồ ghế**: sơ đồ ghế nên được định nghĩa ở cấp độ loại xe (template sơ đồ: 29 chỗ ngồi / 34 giường nằm / 22 limousine) và áp dụng cho từng Bus cụ thể, tránh phải khai báo lại thủ công cho mỗi chuyến.
- **Check-in**: Staff nhập mã booking hoặc quét mã QR mô phỏng; hệ thống gọi tới Booking Service để xác minh vé thuộc đúng chuyến, đúng ngày, chưa check-in, sau đó chuyển trạng thái booking/vé sang CHECKED_IN.
- **Log sự kiện**: tận dụng lại chính các sự kiện đã publish vào Kafka/RabbitMQ ở các module khác (tạo chuyến, booking.paid, check-in) để hiển thị màn hình "nhật ký hệ thống" cho Admin, tránh phải ghi log riêng một lần nữa.
- **Phân quyền theo route/resource**: tầng GraphQL Gateway kiểm tra role trong token trước khi cho phép gọi các mutation/query dành cho Admin/Staff.

---

## 8. Module 5 — Phân tích Dữ liệu, Chatbot AI & Máy chủ MCP

### 8.1. Phân tích dữ liệu (Analytics)

**Yêu cầu:**
- Ghi sự kiện tìm kiếm vào Kafka topic `search-events`.
- Ghi sự kiện booking vào topic `booking-events`.
- Ghi sự kiện thanh toán vào topic `payment-events`.
- Analytics Consumer đọc các topic và lưu dữ liệu tổng hợp.
- Dashboard cho Admin: doanh thu theo ngày, số vé bán theo tuyến, top tuyến được tìm kiếm nhiều, tỷ lệ booking thành công/số lượt tìm kiếm.

**Cách thực hiện:**
- Analytics Consumer nên ghi dữ liệu vào một kho lưu trữ tối ưu cho truy vấn tổng hợp (ví dụ một bảng dạng "fact table" tách biệt khỏi database giao dịch chính), để các truy vấn dashboard không ảnh hưởng hiệu năng của luồng đặt vé.
- Có thể tổng hợp theo khung thời gian (aggregation window) — ví dụ cập nhật số liệu theo ngày — thay vì tính toán lại từ đầu mỗi lần Admin xem dashboard.
- Tỷ lệ chuyển đổi (booking thành công / lượt tìm kiếm) được tính bằng cách join dữ liệu từ `search-events` và `booking-events` theo khoảng thời gian và/hoặc theo tuyến.

### 8.2. Chatbot AI

**Yêu cầu:**
- Chatbot xuất hiện ở trang tìm chuyến và trang booking.
- Trả lời câu hỏi chính sách đổi/hủy vé dựa trên tài liệu nội bộ, có hiển thị nguồn tham chiếu.
- Gợi ý chuyến dựa trên câu hỏi tự nhiên (ví dụ "Tối mai có xe từ Sài Gòn đi Đà Lạt không?").
- Gọi tool nội bộ `searchTrips` thay vì tự bịa dữ liệu.
- Hướng dẫn các bước đặt vé.
- Tra cứu trạng thái booking nếu người dùng cung cấp đủ mã booking và email.
- Từ chối cung cấp thông tin booking nếu thiếu thông tin xác thực.

**Cách thực hiện:**
- Sử dụng AI SDK với cơ chế **function calling / tool calling**: định nghĩa các tool có schema rõ ràng (ví dụ `searchTrips(from, to, date)`, `getBookingStatus(bookingCode, email)`) mà mô hình AI có thể gọi khi cần dữ liệu thật, thay vì tự sinh câu trả lời từ "trí nhớ".
- Với câu hỏi chính sách, áp dụng mô hình **retrieval-augmented**: lưu các tài liệu chính sách (hủy vé, check-in) dưới dạng đoạn văn bản có thể tìm kiếm được, chatbot truy xuất đoạn liên quan trước khi trả lời, và luôn trích dẫn nguồn (ví dụ "Theo chính sách hủy vé nội bộ...") để tăng độ tin cậy và tránh "ảo giác" (hallucination).
- **Cơ chế xác thực trước khi trả thông tin booking**: chatbot cần yêu cầu người dùng cung cấp đồng thời mã booking và email đã dùng khi đặt vé; chỉ khi cả hai khớp với dữ liệu hệ thống mới trả kết quả tra cứu — đây là bước kiểm tra bắt buộc ở tầng tool, không chỉ dựa vào lời nhắc (prompt) cho mô hình.
- Chatbot Service nên gọi lại chính GraphQL Gateway (hoặc Service Facade dùng chung với MCP Server) để đảm bảo dữ liệu trả lời luôn nhất quán với dữ liệu hiển thị trên web.

### 8.3. MCP Server

**Yêu cầu:**
Cung cấp tool và resource để AI client bên ngoài (ví dụ Claude Desktop, Claude Code, hoặc agent tùy chỉnh) có thể tương tác trực tiếp với hệ thống.

**Danh sách tool đề xuất:**
| Tool | Mục đích |
|---|---|
| `search_trips` | Tìm chuyến theo điểm đi, điểm đến, ngày |
| `get_trip_detail` | Lấy chi tiết một chuyến |
| `get_booking_status` | Tra cứu trạng thái booking |
| `get_revenue_summary` | Lấy doanh thu tổng hợp cho admin |
| `get_popular_routes` | Lấy danh sách tuyến được tìm kiếm nhiều |

**Danh sách resource đề xuất:**
| Resource | Nội dung |
|---|---|
| `bus://policy/cancellation` | Chính sách hủy vé |
| `bus://policy/checkin` | Hướng dẫn check-in |
| `bus://routes/popular` | Tuyến phổ biến |
| `bus://system/health` | Tình trạng service demo |

**Cách thực hiện:**
- MCP Server nên là một service mỏng (thin layer): mỗi tool trong MCP Server chỉ đơn thuần ánh xạ (map) sang một truy vấn/mutation tương ứng ở GraphQL Gateway hoặc gọi thẳng gRPC vào các service nghiệp vụ tương ứng — tránh trùng lặp logic nghiệp vụ với Chatbot Service và web app.
- Các tool có tác động dữ liệu nhạy cảm (ví dụ `get_revenue_summary`) cần cơ chế xác thực/uỷ quyền riêng cho AI client (ví dụ theo API key hoặc theo phạm vi quyền được cấp cho client đó), không nên mở công khai không kiểm soát.
- Resource dạng tài liệu chính sách (`bus://policy/...`) nên trỏ tới cùng nguồn dữ liệu mà Chatbot AI dùng để trả lời, đảm bảo tính nhất quán giữa hai kênh.
- `bus://system/health` nên tổng hợp trạng thái "sống" của các service chính (Trip, Seat Inventory, Booking) để AI client hoặc người vận hành có thể kiểm tra nhanh tình trạng hệ thống demo.

---

## 9. Mô hình dữ liệu tổng quan (thực thể chính)

| Thực thể | Mô tả ngắn |
|---|---|
| User | Tài khoản người dùng (Registered Customer, Admin, Staff) |
| Route | Tuyến xe: điểm đi, điểm đến, các điểm dừng |
| Bus | Xe cụ thể: loại xe, sơ đồ ghế áp dụng |
| SeatMapTemplate | Mẫu sơ đồ ghế theo loại xe |
| Trip | Một chuyến cụ thể: Route + Bus + khung giờ + giá vé + trạng thái |
| Seat | Trạng thái từng ghế theo từng Trip |
| Booking | Đơn đặt vé: trạng thái theo state machine, danh sách hành khách/ghế |
| Passenger | Thông tin hành khách gắn với một ghế trong Booking |
| Ticket | Vé điện tử sinh ra sau khi booking PAID |
| Payment | Bản ghi giao dịch thanh toán mô phỏng |
| PolicyDocument | Tài liệu chính sách dùng cho Chatbot/MCP resource |

---

## 10. Yêu cầu phi chức năng (Non-functional Requirements)

- **Hiệu năng**: thao tác giữ ghế phải phản hồi gần thời gian thực (mục tiêu dưới ~1 giây trong điều kiện demo).
- **Nhất quán dữ liệu ghế**: không được để xảy ra tình trạng bán trùng ghế trong bất kỳ trường hợp nào — ưu tiên cao nhất trong toàn hệ thống.
- **Khả năng mở rộng**: các service nghiệp vụ (đặc biệt Search, Seat Inventory) cần thiết kế để có thể chạy nhiều instance phía sau Nginx/load balancer.
- **Bảo mật**: xác thực bằng token cho Registered Customer/Admin/Staff; xác thực bổ sung (mã booking + email) cho tra cứu của Guest; MCP tool có tác động nhạy cảm cần cơ chế uỷ quyền riêng.
- **Khả năng quan sát (Observability)**: log các sự kiện nghiệp vụ chính (tạo chuyến, booking.paid, check-in) để phục vụ cả màn hình "nhật ký hệ thống" của Admin lẫn việc gỡ lỗi.
- **Khả năng chịu lỗi**: nếu một bước xử lý bất đồng bộ thất bại (ví dụ Email Worker lỗi), không được ảnh hưởng tới trạng thái booking đã PAID; cần cơ chế retry cho các worker.

---

## 11. Lộ trình triển khai đề xuất

1. **Giai đoạn 1 — Nền tảng**: dựng khung Microservices, GraphQL Gateway, Nginx, thiết lập Redis/Kafka/RabbitMQ, mô hình dữ liệu cơ bản (Route, Bus, Trip).
2. **Giai đoạn 2 — Module 1 & 2**: tìm kiếm chuyến, autocomplete, sơ đồ ghế, giữ ghế TTL, GraphQL Subscription realtime.
3. **Giai đoạn 3 — Module 3**: luồng đặt vé đầy đủ, thanh toán mô phỏng, sinh vé, gửi email, tra cứu vé, hủy vé.
4. **Giai đoạn 4 — Module 4**: trang quản trị đầy đủ, check-in, phân quyền.
5. **Giai đoạn 5 — Module 5**: pipeline analytics (Kafka), dashboard báo cáo, Chatbot AI (function calling + retrieval chính sách), MCP Server (tool + resource).
6. **Giai đoạn 6 — Hoàn thiện**: kiểm thử tranh chấp ghế đồng thời, kiểm thử toàn luồng (end-to-end), tối ưu SEO, rà soát bảo mật/phân quyền.

---

## 12. Kịch bản kiểm thử trọng tâm

- Hai người dùng cùng giữ một ghế đồng thời → chỉ một người thành công.
- Booking hết hạn thanh toán → ghế tự động giải phóng, booking chuyển EXPIRED.
- Thanh toán thất bại (mô phỏng) → không sinh vé, không gửi email, ghế được giải phóng.
- Chatbot nhận câu hỏi tra cứu booking nhưng thiếu email → từ chối cung cấp thông tin.
- MCP tool `get_revenue_summary` gọi từ client không đủ quyền → bị từ chối.
- Admin khóa ghế (BLOCKED) trong lúc khách đang giữ ghế đó → cần định nghĩa rõ hành vi ưu tiên (đề xuất: không cho khóa ghế đang ở trạng thái HELD/BOOKED, chỉ khóa được ghế AVAILABLE).
