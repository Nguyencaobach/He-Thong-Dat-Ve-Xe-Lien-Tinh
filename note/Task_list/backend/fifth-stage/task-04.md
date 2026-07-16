# Task 04: `payment-service` — Giả lập xử lý thanh toán

## 1. Nội dung công việc
Xây dựng `payment-service` giả lập: nhận yêu cầu thanh toán qua gRPC, random thành công/thất bại, lưu transaction vào `payment_db`, và publish kết quả lên RabbitMQ.

## 2. Ý nghĩa thực hiện của Task này
- **Giả lập (Đặc tả 6.3 điểm 4):** Không tích hợp cổng thanh toán thật. Dùng `Math.random() < SUCCESS_RATE` (mặc định 90% thành công) để mô phỏng. Trong thực tế sẽ gọi VNPay/Momo SDK ở đây.
- **Lưu transaction:** Mỗi lần xử lý tạo 1 record trong `transactions` (payment_db) để tra cứu sau qua `CheckPaymentStatus`.
- **Publish RabbitMQ:** Sau khi xử lý, publish `payment.succeeded` hoặc `payment.failed` lên exchange `payment.events`. booking-service sẽ subscribe để biết kết quả.
- **Thời gian xử lý giả lập:** Random 100-500ms để mô phỏng độ trễ thực tế của cổng thanh toán.

## 3. Các file được tạo/chỉnh sửa
- `payment-service/.env` — Cấu hình Postgres, RabbitMQ, tỉ lệ thành công
- `payment-service/knexfile.js` — Kết nối `payment_db`
- `payment-service/src/db.js` — Knex instance
- `payment-service/src/paymentService.js` — Logic giả lập
- `payment-service/src/paymentRepository.js` — Lưu/đọc transactions
- `payment-service/src/paymentGrpcHandlers.js` — RPC: `ProcessPayment`, `CheckPaymentStatus`
- `payment-service/src/rabbitmqPublisher.js` — Publish kết quả thanh toán
- `payment-service/src/server.js` — gRPC server port 50054
- `payment-service/db/migrations/20261010100000_create_transactions_table.js` — Bảng `transactions`

## 4. Câu lệnh cần chạy

```bash
# Từ thư mục Backend
cd services/payment-service
npm run migrate   # Tạo bảng transactions trong payment_db
cd ../..

npm run dev --workspace=payment-service
```
