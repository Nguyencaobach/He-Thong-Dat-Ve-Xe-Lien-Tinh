# Hướng dẫn khởi chạy dự án (Dành cho người mới clone Git về)

Vì dự án được thiết kế chuẩn **Monorepo** và tự động hóa bằng **Docker**, bạn chỉ cần làm đúng các lệnh sau (chạy tại thư mục `Backend`):

---

## 🚀 Tóm tắt lệnh nhanh — Fresh Start

```bash
# 1. Cài đặt toàn bộ thư viện cho tất cả service
npm install

# 2. Khởi động Hạ tầng (Postgres, Redis, RabbitMQ, Kafka)
docker-compose up -d

# 3. Tạo bảng (Migrate) và chèn dữ liệu mẫu (Seed) cho các Service dùng Postgres
cd services/trip-service && npm run migrate && npm run seed && cd ../..
cd services/booking-service && npm run migrate && cd ../..
cd services/payment-service && npm run migrate && cd ../..
cd services/admin-service && npm run migrate && npm run seed && cd ../..
cd services/analytics-service && npm run migrate && cd ../..

# 4. Khởi động TẤT CẢ service (gồm cả workers, admin, AI) bằng 1 lệnh duy nhất
npm run kill                          # Dọn port cũ (nếu cần)
npm run dev                           # Bật đồng loạt tất cả service
```

---

## 📌 Các Port đang sử dụng (Khi chạy `npm run dev`)

| Màu | Service | Port | Ghi chú |
|---|---|---|---|
| Xanh dương | `api-gateway` (HTTP + WS) | 4000 | Phân quyền ADMIN/STAFF |
| Xanh lá | `trip-service` (gRPC) | 50051 | Cần migrate + seed |
| Vàng | `seat-service` (gRPC) | 50052 | Dùng Redis, ko cần DB |
| Tím | `booking-service` (gRPC) | 50053 | Cần migrate |
| Xanh ngọc | `payment-service` (gRPC) | 50054 | Cần migrate |
| Đỏ | `ticket-worker` (Worker) | — | Chạy ngầm |
| Trắng | `notification-worker` (Worker) | — | Chạy ngầm |
| Xám | `admin-service` (gRPC) | 50055 | Cần migrate + seed template |
| Đen | `analytics-service` (gRPC/Kafka) | 50056 | Cần migrate |
| Xanh sáng | `chatbot-service` (HTTP/AI) | 4001 | Cần API Key Gemini ở `.env` |
| Lục sáng | `mcp-server` (MCP) | stdio | Cho Cursor / Claude |

> **GraphQL Sandbox:** Truy cập `http://localhost:4000/graphql` sau khi chạy.

---

## ⚠️ Khi cần Reset toàn bộ dữ liệu Docker

```bash
docker-compose down -v   # Xóa volume (mất toàn bộ data)
docker-compose up -d     # Tạo lại từ đầu
# Nhớ chạy lại bước 3 (Migrate + Seed) ở trên!
```
