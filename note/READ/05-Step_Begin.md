# Hướng dẫn khởi chạy dự án (Dành cho người mới clone Git về)

Vì dự án được thiết kế chuẩn **Monorepo** và tự động hóa bằng **Docker**, bất kỳ ai (hoặc thầy cô) tải source code về chỉ cần làm đúng các bước sau là hệ thống tự động dựng lên:

---

## Bước 1: Cài đặt toàn bộ thư viện (Dependencies)

Mở Terminal tại thư mục **`Backend`** và gõ:

```bash
npm install
```

*(Giải thích: Nhờ cơ chế NPM Workspaces đã thiết lập, lệnh này tự động quét qua tất cả service và các gói dùng chung như `common-utils`, `event-schemas` để tải mọi thư viện cần thiết. Không cần chui vào từng thư mục để chạy lẻ tẻ.)*

---

## Bước 2: Khởi động Hạ tầng & Tự tạo Cơ sở dữ liệu

Vẫn ở Terminal đó, gõ:

```bash
docker-compose up -d
```

*(Giải thích: Docker sẽ kéo Postgres, Redis, RabbitMQ, Kafka, Zookeeper về. Đặc biệt, Postgres sẽ tự động đọc thư mục `infrastructure/init-db/` để:*
- *Tạo sẵn 6 Database rỗng (`trip_db`, `booking_db`, `admin_db`, `analytics_db`, `payment_db`, `users_db`)*
- *Tạo bảng `users` trong `users_db` (từ `06_init_gateway_db.sql`)*

*Tất cả tự động, không cần mở DBeaver hay pgAdmin.)*

---

## ⚠️ Lưu ý: Khi cần Reset toàn bộ dữ liệu

Nếu muốn xóa sạch dữ liệu cũ và tạo lại từ đầu (ví dụ: thêm bảng mới vào file SQL init):

```bash
docker-compose down -v
docker-compose up -d
```

*(Lệnh `-v` xóa volume cũ, ép Postgres khởi tạo lại từ đầu và chạy lại toàn bộ script trong `init-db/`.)*

---

## Bước 3: Kiểm tra Docker đã chạy đủ các service chưa

```bash
docker ps
```

Bạn sẽ thấy 5 container đang chạy:

| Container | Image | Port |
|---|---|---|
| `bus_postgres` | postgres:15-alpine | 5432 |
| `bus_redis` | redis:7-alpine | 6379 |
| `bus_rabbitmq` | rabbitmq:3-management | 5672, 15672 |
| `bus_zookeeper` | cp-zookeeper:7.4.0 | 2181 |
| `bus_kafka` | cp-kafka:7.4.0 | 9092 |

---

## Bước 4: Kiểm tra bảng `users` đã tạo thành công chưa

```bash
docker exec -it bus_postgres psql -U admin -d users_db -c "\d users"
```

*(Nếu thấy cấu trúc bảng hiện ra là thành công.)*

---

## Bước 5: Khởi động API Gateway

```bash
# Chạy trong môi trường development (tự reload khi sửa code)
npm run dev --workspace=api-gateway

# Hoặc chạy thẳng
cd api-gateway && node src/server.js
```

Sau khi chạy thành công, truy cập **GraphQL Sandbox** tại:
```
http://localhost:4000/graphql
```

---

## Tóm tắt lệnh nhanh (Fresh start)

```bash
# 1. Cài thư viện
npm install

# 2. Khởi động hạ tầng (tạo DB + bảng tự động)
docker-compose up -d

# 3. Khởi động API Gateway
npm run dev --workspace=api-gateway
```
