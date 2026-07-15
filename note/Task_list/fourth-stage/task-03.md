# Task 03: Cài đặt cơ chế SETNX trên Redis để giữ ghế nguyên tử (Atomic Hold)

## 1. Nội dung công việc
Viết `seatRepository.js` với hàm `holdSeat()` sử dụng lệnh Redis `SET key value NX EX ttl` để đảm bảo tính atomic khi hai người dùng cùng giữ một ghế tại cùng thời điểm.

## 2. Ý nghĩa thực hiện của Task này
- **Vấn đề Race Condition:** Nếu dùng cách thông thường (GET → kiểm tra → SET, 3 bước), hai request đến gần như đồng thời đều sẽ GET ra "chưa có ai giữ", đều nghĩ mình được phép SET, và cả hai đều SET thành công → bán trùng ghế.
- **Giải pháp SETNX:** Lệnh `SET key value NX EX seconds` là một lệnh duy nhất, atomic ở tầng Redis. Redis đảm bảo chỉ một trong hai request SET thành công, request còn lại nhận `null` (thất bại). Không có tình huống cả hai đều thành công.
- **Thiết kế key Redis:**
  ```
  hold:{tripId}:{seatId}    → TTL 300s (tự nhả khi hết hạn)
  booked:{tripId}:{seatId}  → Không TTL (vĩnh viễn)
  blocked:{tripId}:{seatId} → Không TTL (admin mở khóa thủ công)
  seatmap:{tripId}          → Không TTL (dữ liệu cố định)
  ```

## 3. Các file được tạo/chỉnh sửa
- `seat-service/src/seatRepository.js` — Toàn bộ logic thao tác Redis:
  - `holdSeat()`: SET NX EX (atomic)
  - `releaseSeat()`: Kiểm tra owner + DEL
  - `forceReleaseSeat()`: Force DEL không kiểm tra owner
  - `bookSeat()`: Pipeline xóa hold + tạo booked
  - `blockSeat()`: Tạo blocked key (từ chối nếu đang HELD/BOOKED)
  - `unblockSeat()`: Xóa blocked key
  - `getSeatStatus()`: Check 3 key song song (Promise.all)
  - `getSeatMap()`: Pipeline kiểm tra trạng thái toàn bộ ghế 1 round-trip
  - `setSeatMap()`: Lưu sơ đồ ghế custom

## 4. Câu lệnh cần chạy
*(Không cần chạy lệnh riêng — logic này được test thông qua gRPC khi chạy seat-service)*
