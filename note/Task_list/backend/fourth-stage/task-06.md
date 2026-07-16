# Task 06: Phát sự kiện thay đổi trạng thái ghế lên Redis Pub/Sub

## 1. Nội dung công việc
Viết `redisPubSub.js` trong `seat-service` với hàm `publishSeatStatusChange()` được gọi sau **mỗi** thay đổi trạng thái ghế (hold, release, book, block, unblock). File này đóng vai trò "phát sóng" để api-gateway và các client WebSocket nhận được cập nhật tức thì.

## 2. Ý nghĩa thực hiện của Task này
- **Fire and forget:** Publish lên Redis Pub/Sub là bất đồng bộ và không chờ kết quả (`publishSeatStatusChange(...).catch(() => {})`). Nếu publish thất bại thì chỉ bị mất 1 thông báo real-time, không ảnh hưởng đến thao tác chính (hold/book thành công hay thất bại vẫn giữ nguyên).
- **Cùng channel, cùng cấu trúc:** Tên channel (`seat_status_updates`) và cấu trúc payload (`{ tripId, seatId, seatNumber, status, updatedAt }`) phải khớp chính xác với những gì `seatEventsConsumer.js` ở api-gateway đang lắng nghe.
- **5 sự kiện được publish:**
  - `holdSeat` thành công → status = `HELD`
  - `releaseSeat` / `forceReleaseSeat` → status = `AVAILABLE`
  - `bookSeat` thành công → status = `BOOKED`
  - `blockSeat` thành công → status = `BLOCKED`
  - `unblockSeat` thành công → status = `AVAILABLE`
  - TTL expired (từ server.js keyspace listener) → status = `AVAILABLE`

## 3. Các file được tạo/chỉnh sửa
- `seat-service/src/redisPubSub.js` — Module publish sự kiện ghế
- `seat-service/src/seatService.js` — Gọi `redisPubSub.publishSeatStatusChange()` sau mỗi thao tác

## 4. Câu lệnh cần chạy
*(Không cần lệnh riêng)*

**Test thủ công bằng redis-cli:**
```bash
# Terminal 1: Subscribe để nghe
redis-cli -p 6379 SUBSCRIBE seat_status_updates

# Terminal 2: Gọi holdSeat qua GraphQL
# Sau khi gọi holdSeat thành công, Terminal 1 sẽ in ra:
# 1) "message"
# 2) "seat_status_updates"
# 3) "{\"tripId\":\"1\",\"seatId\":\"1_A01\",\"seatNumber\":\"A01\",\"status\":\"HELD\",...}"
```
