# Hướng dẫn khởi chạy dự án (Dành cho người mới clone Git về)

Vì dự án được thiết kế chuẩn **Monorepo** và tự động hóa bằng **Docker**, bất kỳ ai (hoặc thầy cô) tải source code về chỉ cần làm đúng các bước sau là hệ thống tự động dựng lên:

---

## Bước 1: Cài đặt toàn bộ thư viện (Dependencies)

Mở Terminal tại thư mục **`Backend`** và gõ:

```bash
npm install
```

*(Giải thích: Nhờ cơ chế NPM Workspaces, lệnh này tự động quét qua tất cả service và các gói dùng chung (`common-utils`, `event-schemas`) để tải mọi thư viện cần thiết — không cần chui vào từng thư mục chạy riêng.)*

---

## Bước 2: Khởi động Hạ tầng & Tự tạo Cơ sở dữ liệu

```bash
docker-compose up -d
```

Docker sẽ khởi động 5 container và Postgres tự động chạy scripts trong `infrastructure/init-db/`:
- Tạo sẵn 6 Database rỗng (`trip_db`, `booking_db`, `admin_db`, `analytics_db`, `payment_db`, `users_db`)
- Tạo bảng `users` trong `users_db` (từ `06_init_gateway_db.sql`)

---

## Bước 3: Kiểm tra Docker đã chạy đủ chưa

```bash
docker ps
```

| Container | Image | Port |
|---|---|---|
| `bus_postgres` | postgres:15-alpine | 5432 |
| `bus_redis` | redis:7-alpine | 6379 |
| `bus_rabbitmq` | rabbitmq:3-management | 5672, 15672 |
| `bus_zookeeper` | cp-zookeeper:7.4.0 | 2181 |
| `bus_kafka` | cp-kafka:7.4.0 | 9092 |

---

## Bước 4: Chạy Migration & Seed cho các Service (Knex)

Các service dùng Knex cần tạo bảng và chèn dữ liệu mẫu thủ công.
> ⚠️ Bắt buộc theo thứ tự: **migrate → seed**

### `trip-service` (Giai đoạn 3)
```bash
cd services/trip-service
npm run migrate   # Tạo bảng: routes, trips, outbox_events
npm run seed      # Chèn 6 tuyến mẫu + ~100 chuyến 7 ngày tới
cd ../..
```

### `booking-service` (Giai đoạn 5)
```bash
cd services/booking-service
npm run migrate   # Tạo bảng: bookings, passengers, outbox_events
cd ../..
```

### `payment-service` (Giai đoạn 5)
```bash
cd services/payment-service
npm run migrate   # Tạo bảng: transactions
cd ../..
```

*(seat-service không cần migrate/seed — dùng Redis, không dùng Postgres)*

---

## Bước 5: Khởi động các Service (đồng bộ — chạy local)

Các service giao tiếp gRPC cần chạy local:

```bash
# Chạy TẤT CẢ service bằng 1 lệnh duy nhất (từ thư mục Backend)
npm run kill
npm run dev
```

Lệnh trên sử dụng `concurrently` để bật đồng loạt tất cả service trong cùng một terminal, mỗi service được tô màu riêng để phân biệt:

| Màu | Service | Port |
|---|---|---|
| Xanh dương | `api-gateway` (HTTP + WebSocket) | 4000 |
| Xanh lá | `trip-service` (gRPC) | 50051 |
| Vàng | `seat-service` (gRPC) | 50052 |
| Tím | `booking-service` (gRPC) | 50053 |
| Xanh ngọc | `payment-service` (gRPC) | 50054 |
| Đỏ | `ticket-worker` (Worker) | — không có port |
| Trắng | `notification-worker` (Worker) | — không có port |

Sau khi chạy, truy cập **GraphQL Sandbox** tại:
```
http://localhost:4000/graphql
```

---

## ⚠️ Khi cần Reset toàn bộ dữ liệu Docker

```bash
docker-compose down -v   # Xóa volume (mất toàn bộ data)
docker-compose up -d     # Tạo lại từ đầu
# Sau đó chạy lại migrate + seed cho từng service
```

---

## 📋 Tóm tắt lệnh nhanh — Fresh Start (Giai đoạn 6)

```bash
# ── Từ thư mục Backend ──────────────────────────────
npm install                           # 1. Cài thư viện (tất cả service)

docker-compose up -d                  # 2. Khởi động hạ tầng

# ── Tạo bảng cho các service dùng Postgres ──────────
cd services/trip-service && npm run migrate && npm run seed && cd ../..
cd services/booking-service && npm run migrate && cd ../..
cd services/payment-service && npm run migrate && cd ../..

# ── Khởi động tất cả (gồm cả workers) ───────────────
npm run kill                          # Dọn port cũ (nếu cần)
npm run dev                           # Bật đồng loạt: gateway + trip + seat + booking + payment + ticket-worker + notification-worker
```

> ⚠️ **Lưu ý Giai đoạn 6:** `ticket-worker` và `notification-worker` là **worker chạy nền**, không có HTTP/gRPC port, không cần migrate. Vé HTML sẽ được lưu tại `services/ticket-worker/generated-tickets/`.

---

## 📌 Ghi chú phân loại Service

| Loại | Service | Chạy ở đâu | Cần migrate/seed? |
|---|---|---|---|
| **Đồng bộ (gRPC)** | api-gateway, trip-service | Local (npm run dev) | trip-service: ✅ |
| **Đồng bộ (gRPC) — G4** | seat-service | Local (npm run dev) | ❌ (dùng Redis) |
| **Đồng bộ (gRPC) — G5** | booking-service, payment-service | Local (npm run dev) | ✅ (migrate) |
| **Worker nền — G6** | ticket-worker, notification-worker | Local (npm run dev) | ❌ (không có DB) |
| **Worker phân tích — G8** | analytics-consumer | Local (Giai đoạn sau) | ❌ |
| **Hạ tầng** | Postgres, Redis, RabbitMQ, Kafka | Docker | ❌ (tự động) |
