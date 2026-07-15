# Task 01: Knex Migrations tạo bảng `Bus`, Sơ đồ ghế template

## 1. Nội dung công việc
Tạo migration + seed cho `admin-service` (Postgres `admin_db`): bảng `buses`, `seat_layout_templates`, `blocked_seats`, `admin_events`.

## 2. Ý nghĩa thực hiện của Task này
- **`seat_layout_templates` (Đặc tả 7.3):** Template sơ đồ ghế theo loại xe: `SLEEPER_34` (34 giường nằm 2 tầng), `SEAT_29` (29 chỗ ngồi), `LIMOUSINE_22` (22 ghế VIP). Khi Admin tạo xe mới, chọn loại xe → layout được clone từ template thay vì khai báo thủ công từng ghế.
- **`buses`:** Thông tin xe vật lý: biển số, loại xe, tổng ghế, sơ đồ ghế thực tế (JSON), trạng thái. Tách biệt dữ liệu tĩnh xe (buses) khỏi dữ liệu theo thời gian (trips) — theo đặc tả 7.3.
- **`blocked_seats`:** Ghi nhận ghế bị Admin khóa (BLOCKED) cho từng chuyến. seat-service giữ state trong Redis (ephemeral); admin-service ghi vào Postgres để audit và replay sau restart.
- **`admin_events`:** Audit log: ai làm gì, khi nào, với dữ liệu gì. Đặc tả 7.2 điểm 9: "Xem log các sự kiện chính".
- **Seed 3 templates:** `SLEEPER_34`, `SEAT_29`, `LIMOUSINE_22` — mỗi template là JSON array các ghế với `{ id, label, row, col, floor, type }`.

## 3. Các file được tạo/chỉnh sửa
- `admin-service/knexfile.js` — Kết nối `admin_db`, cấu hình migrations + seeds
- `admin-service/db/migrations/20261010100000_create_admin_tables.js` — 4 bảng
- `admin-service/db/seeds/01_seat_layout_templates.js` — 3 templates mẫu
- `admin-service/package.json` — Thêm `npm run migrate` + `npm run seed`

## 4. Câu lệnh cần chạy
```bash
cd services/admin-service
npm run migrate   # Tạo 4 bảng trong admin_db
npm run seed      # Chèn 3 seat_layout_templates
cd ../..
```
