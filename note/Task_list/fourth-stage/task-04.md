# Task 04: Viết logic nhả ghế (khi hết hạn TTL hoặc khách hủy)

## 1. Nội dung công việc
Triển khai hai cơ chế nhả ghế:
1. **Tự động (TTL hết hạn):** Redis tự xóa hold key sau 300 giây → `server.js` lắng nghe sự kiện `__keyevent@0__:expired` để thông báo real-time
2. **Chủ động (khách hủy):** `releaseSeat()` trong `seatRepository.js` xóa hold key có kiểm tra owner

## 2. Ý nghĩa thực hiện của Task này
- **Tự động qua TTL:** Không cần cron job hay timer riêng — Redis tự làm. Khi TTL hết, Redis xóa key và phát sự kiện qua Keyspace Notification. `server.js` của `seat-service` lắng nghe kênh `__keyevent@0__:expired`, parse tên key để lấy `tripId` và `seatId`, rồi publish sự kiện "ghế về AVAILABLE" cho Frontend.
- **Chủ động có bảo vệ:** `releaseSeat(tripId, seatId, userId)` kiểm tra `holdData.userId === userId` trước khi xóa. Điều này ngăn người A vô tình (hoặc cố ý) nhả ghế của người B.
- **Force Release (không kiểm tra):** `forceReleaseSeat()` dành cho admin hoặc khi booking EXPIRED — xóa key mà không kiểm tra owner.
- **Sự kiện TTL hết hạn cũng publish lên RabbitMQ** (`seat.expired`) để sau này `booking-service` biết cần chuyển booking sang trạng thái EXPIRED.

## 3. Các file được tạo/chỉnh sửa
- `seat-service/src/seatRepository.js` — `releaseSeat()`, `forceReleaseSeat()`
- `seat-service/src/seatService.js` — `releaseSeat()`, `forceReleaseSeat()` kèm publish Pub/Sub sau khi nhả
- `seat-service/src/server.js` — Subscribe `__keyevent@0__:expired`, parse key và publish "AVAILABLE"

## 4. Câu lệnh cần chạy
*(Không cần lệnh riêng — được test khi giữ ghế rồi chờ 5 phút)*

**Test thủ công:**
```bash
# Trong redis-cli, set 1 hold key với TTL 10 giây rồi quan sát log seat-service
redis-cli -p 6379
SET hold:trip1:trip1_A01 '{"userId":"test"}' EX 10
# Sau 10 giây, seat-service sẽ log: "TTL EXPIRED: hold:trip1:trip1_A01 → ghế A01 về AVAILABLE"
```
