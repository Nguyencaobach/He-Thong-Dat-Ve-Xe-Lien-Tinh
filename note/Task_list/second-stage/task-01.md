# Task 01: Khởi tạo dự án Apollo Server (GraphQL) trong `api-gateway`

## 1. Nội dung công việc
Cấu hình `package.json` cho `api-gateway` với đầy đủ dependencies cần thiết, thiết lập file `.env` chứa các biến môi trường, và viết `server.js` để khởi chạy Apollo GraphQL Server tích hợp Express.

## 2. Ý nghĩa thực hiện của Task này
- **Điểm vào duy nhất:** `api-gateway` là "lễ tân trung tâm" — mọi request từ Frontend đều đi qua đây. Apollo Server là thư viện GraphQL phổ biến nhất cho Node.js, hỗ trợ Queries, Mutations và Subscriptions.
- **Tích hợp Express:** Apollo Server v4 chạy trên Express để dễ dàng thêm middleware (JWT, CORS) sau này.
- **Tách biến môi trường:** File `.env` chứa các thông tin nhạy cảm (DB password, JWT secret, địa chỉ service) — không bao giờ commit lên Git.

## 3. Các file được tạo/chỉnh sửa
- `api-gateway/package.json` — Khai báo dependencies: `@apollo/server`, `express`, `graphql`, `bcryptjs`, `jsonwebtoken`, `pg`, `@grpc/grpc-js`, v.v.
- `api-gateway/.env` — Biến môi trường: PORT, DB connection, JWT_SECRET, gRPC URLs
- `api-gateway/src/server.js` — File chạy chính

## 4. Câu lệnh sử dụng để chạy

```bash
# Cài đặt tất cả dependencies từ thư mục Backend (root monorepo)
npm install

# Khởi động api-gateway ở chế độ development
npm run dev --workspace=api-gateway

# Hoặc vào thẳng thư mục chạy
cd api-gateway
node src/server.js
```
