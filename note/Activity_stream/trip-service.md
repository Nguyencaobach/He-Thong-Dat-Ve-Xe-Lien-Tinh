# Luồng hoạt động: Trip Service (`trip-service`)

## 1. Giới thiệu chung
- **Vai trò:** Quản lý thông tin cốt lõi về tuyến xe (Route) và chuyến xe (Trip). Là điểm xuất phát để người dùng tìm kiếm chuyến xe phù hợp.
- **Công nghệ:** Node.js, gRPC Server, PostgreSQL (Knex).
- **Port hoạt động:** `50051`

## 2. Luồng xử lý chi tiết (Internal Logic)
Khi một request tìm chuyến xe từ `api-gateway` đẩy xuống qua gRPC:
1. **gRPC Handlers (`src/grpcHandlers.js`):**
   - Đóng vai trò là Controller. Hàm `SearchTrips` nhận request chứa các tham số: `departure`, `destination`, `date`.
   - Nó kiểm tra tính hợp lệ của tham số và gọi xuống tầng Service.
2. **Business Logic (`src/tripService.js`):**
   - Không có quá nhiều logic phức tạp ở bước này, chủ yếu đóng vai trò trung chuyển xuống Database Layer. Tuy nhiên, nếu có quy tắc nghiệp vụ (VD: định dạng ngày, filter các chuyến đã khởi hành), nó sẽ được xử lý ở đây.
3. **Database Layer (`src/tripRepository.js`):**
   - Sử dụng Knex query builder để giao tiếp với PostgreSQL (`trip_db`).
   - File `src/db.js` khởi tạo kết nối. Các Migration/Seed đã tạo sẵn bảng `routes` (Tuyến: VD Sài Gòn - Đà Lạt) và `trips` (Chuyến xe cụ thể, gắn với ngày giờ xuất phát).
   - Truy vấn SQL (JOIN giữa routes và trips) sẽ lấy ra danh sách các chuyến khớp với điều kiện tìm kiếm và trả ngược về.
4. **Trả về kết quả:** Kết quả được map sang cấu trúc của `trip.proto` và trả về qua gRPC cho Gateway.

## 3. Tổng kết đánh giá theo Đặc tả
- Tuân thủ kiến trúc "Database-per-service" (sử dụng DB riêng là `trip_db`).
- Code chia 3 tầng rõ ràng (Handler -> Service -> Repository), chuẩn mực và dễ bảo trì.
