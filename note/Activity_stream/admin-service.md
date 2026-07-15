# Luồng hoạt động: Admin Service (`admin-service`)

## 1. Giới thiệu chung
- **Vai trò:** Trung tâm quản lý, cấu hình và vận hành nhà xe (Thêm xe, thiết lập sơ đồ ghế, khóa ghế bị hỏng, check-in lên xe).
- **Công nghệ:** Node.js, gRPC Server, PostgreSQL (Knex).
- **Port hoạt động:** `50055`

## 2. Luồng xử lý chi tiết (Internal Logic)
1. **Phân quyền (RBAC):**
   - Admin Service hoàn toàn không cần tự check token JWT. Khâu bảo vệ bảo mật được đẩy lên tầng API Gateway (`resolvers.js` với hàm `requireAdmin` và `requireAdminOrStaff`). Chỉ khi request hợp lệ mới được lọt xuống port 50055.
2. **Quản lý xe và Sơ đồ ghế (Bus CRUD):**
   - Lưu trữ dữ liệu về từng chiếc xe (biển số, loại xe) và sơ đồ ghế trong bảng `buses`.
   - Bảng `seat_layout_templates` chứa cấu hình chuẩn (34 giường, 29 ghế...). Khi tạo xe mới, admin có thể áp luôn template này vào thay vì phải cấu hình thủ công từng ghế.
3. **Khóa ghế trống (`BlockSeat`):**
   - Nếu một ghế bị hỏng hoặc dành riêng cho tài xế, admin ra lệnh khóa.
   - `adminService.js` sẽ gọi gRPC chéo sang `seat-service` (cổng 50052) với lệnh `HoldSeat` đặc biệt (userId: `ADMIN_BLOCK`). Ghế trên Redis của `seat-service` lập tức biến thành trạng thái HELD.
   - Đồng thời, admin service ghi một record vào bảng `blocked_seats` (Postgres) để lưu lại lịch sử khóa. Dữ liệu trong DB đóng vai trò như Audit Trail.
4. **Check-in hành khách (`checkinService.js`):**
   - Lơ xe / nhân viên soát vé dùng app quét mã QR trên điện thoại của khách (mã này sinh ra từ giai đoạn 6).
   - Gateway truyền mã QR xuống `admin-service`. 
   - `admin-service` sẽ phân tích mã QR, gọi gRPC sang `booking-service` (cổng 50053) để xem vé này có hợp lệ, đúng chuyến, đúng trạng thái đã thanh toán (`PAID` hoặc `TICKET_ISSUED`) hay không.
   - Ghi lại log sự kiện lên `admin_events` để thống kê sau này.

## 3. Tổng kết đánh giá theo Đặc tả
- Mở rộng đầy đủ các nghiệp vụ hành chính (CRUD, Block, Checkin) theo Đặc tả Module 4.
- Ứng dụng Audit Log lưu lại toàn bộ các sự kiện vận hành.
