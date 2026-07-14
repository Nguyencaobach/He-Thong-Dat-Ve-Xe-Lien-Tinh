# Hướng dẫn khởi chạy dự án (Dành cho người mới clone Git về)

Vì dự án được thiết kế chuẩn **Monorepo** và tự động hóa bằng **Docker**, bất kỳ ai (hoặc thầy cô) tải source code về chỉ cần làm đúng 2 bước sau là hệ thống tự động dựng lên 100%:

### Bước 1: Cài đặt toàn bộ thư viện (Dependencies)
Mở Terminal tại thư mục `Backend` và gõ 1 lệnh duy nhất:
```bash
npm install
```
*(Giải thích: Nhờ cơ chế NPM Workspaces mình đã thiết lập, lệnh này sẽ tự động quét qua tất cả 10 services và các gói dùng chung như `common-utils`, `event-schemas` để tải mọi thư viện cần thiết. Mình **không cần** phải chui vào từng thư mục để gõ `npm install winston` hay `ajv` lẻ tẻ nữa).*

### Bước 2: Khởi động Hạ tầng & Tự tạo Cơ sở dữ liệu
Vẫn ở Terminal đó, gõ lệnh:
```bash
docker-compose up -d
```
*(Giải thích: Docker sẽ kéo Postgres, Redis, RabbitMQ, Kafka về. Đặc biệt, Postgres sẽ tự động đọc file mồi `00_create_databases.sh` để tự tạo sẵn 6 cái Database rỗng cho hệ thống mà không cần đụng tay vào DBeaver hay PGAdmin).*
