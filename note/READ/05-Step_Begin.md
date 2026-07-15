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

*(Các service tiếp theo sẽ bổ sung vào đây khi hoàn thiện từng giai đoạn)*

---

## Bước 5: Khởi động các Service (đồng bộ — chạy local)

Các service giao tiếp gRPC cần chạy local:

```bash
# API Gateway (GraphQL, port 4000)
npm run dev --workspace=api-gateway

# Trip/Search Service (gRPC, port 50051) — Giai đoạn 3
npm run dev --workspace=trip-service
```

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

## 📋 Tóm tắt lệnh nhanh — Fresh Start (Giai đoạn 3)

```bash
# ── Từ thư mục Backend ──────────────────────────────
npm install                           # 1. Cài thư viện

docker-compose up -d                  # 2. Khởi động hạ tầng

# ── Tạo bảng + Seed cho trip-service ────────────────
cd services/trip-service
npm run migrate                       # 3. Tạo bảng trip_db
npm run seed                          # 4. Chèn dữ liệu mẫu
cd ../..

# ── Khởi động service ────────────────────────────────
npm run dev --workspace=api-gateway   # 5. API Gateway
npm run dev --workspace=trip-service  # 6. Trip Service (terminal khác)
```

---

## 📌 Ghi chú phân loại Service

| Loại | Service | Chạy ở đâu | Cần migrate/seed? |
|---|---|---|---|
| **Đồng bộ (gRPC)** | api-gateway, trip-service | Local (npm run dev) | trip-service: ✅ |
| **Bất đồng bộ (Worker)** | ticket-worker, notification-worker, analytics-consumer | Docker (Giai đoạn sau) | ❌ |
| **Hạ tầng** | Postgres, Redis, RabbitMQ, Kafka | Docker | ❌ (tự động) |
