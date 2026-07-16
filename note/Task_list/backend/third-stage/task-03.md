# Task 03: Viết File Seed để chèn dữ liệu mẫu

## 1. Nội dung công việc
Viết 2 file seed: `01_routes.js` (6 tuyến mẫu) và `02_trips.js` (~100 chuyến trong 7 ngày tới), để có dữ liệu sẵn khi test toàn bộ luồng tìm kiếm.

## 2. Ý nghĩa thực hiện của Task này
- **Seed ≠ Migration:** Migration tạo cấu trúc bảng (xây nhà), Seed chèn dữ liệu (dọn nội thất). Seed có thể chạy nhiều lần, nên file seed luôn `del()` dữ liệu cũ trước khi insert.
- **6 tuyến theo đặc tả:** TP.HCM → Đà Lạt, Nha Trang, Cần Thơ, Đà Nẵng, Hà Nội, Vũng Tàu — đúng với danh sách gợi ý autocomplete trong spec.
- **Dữ liệu động theo ngày thật:** File seed tính ngày từ `new Date()` tại thời điểm chạy, đảm bảo chuyến luôn trong tương lai (không bị "hết hạn" ngay sau khi seed).
- **Đa loại xe:** SEAT_29, SLEEPER_34, LIMOUSINE_22 — đúng 3 loại xe trong đặc tả Module 2.

## 3. Các file được tạo/chỉnh sửa
- `db/seeds/01_routes.js` — Xóa dữ liệu cũ, chèn 6 tuyến
- `db/seeds/02_trips.js` — Tạo ~100 chuyến (2-4 chuyến/tuyến/ngày × 7 ngày)

## 4. Câu lệnh sử dụng

```bash
# Chèn seed data (phải migrate trước)
npm run seed

# Thứ tự bắt buộc khi khởi tạo lần đầu:
# 1. npm run migrate  → tạo bảng
# 2. npm run seed     → chèn dữ liệu
# 3. npm run dev      → chạy service
```
