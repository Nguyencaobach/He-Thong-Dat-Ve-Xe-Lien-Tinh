# Task 03: Cài đặt tiện ích dùng chung (`common-utils`)

## 1. Nội dung công việc
Khởi tạo và cài đặt các thư viện cơ bản cho thư mục `packages/common-utils`, bao gồm việc viết sẵn hệ thống ghi log (`Logger`) và xử lý lỗi (`Error Handler`).

## 2. Ý nghĩa thực hiện của Task này
- **Chống lặp lại code (Quy tắc DRY):** Trong 10 cái microservices, cái nào cũng cần in log ra màn hình và cái nào cũng cần bắt lỗi (crash server, lỗi 404, lỗi không tìm thấy Database...). Thay vì phải viết đi viết lại đoạn code xử lý lỗi 10 lần ở 10 thư mục khác nhau, ta viết nó 1 lần duy nhất ở đây.
- **Tính đồng nhất toàn hệ thống:** Nhờ dùng chung một cái `Logger` (sử dụng thư viện `winston`), tất cả log của 10 service in ra sẽ có cùng một định dạng (VD: `[Thời gian] - [Tên Service] - [Mức độ lỗi] - Chi tiết`). Về sau khi anh đẩy log lên ElasticSearch hoặc Kibana để soi lỗi, nó sẽ xếp rất gọn gàng và dễ đọc.
- **Tiêu chuẩn hóa mã lỗi (Error Handler):** Giúp chuẩn hóa cấu trúc báo lỗi trả về cho Frontend (luôn luôn có cấu trúc `{ status, message }` để Frontend dễ dàng hiểu và hiển thị popup thông báo lỗi cho người dùng thay vì văng ra một đống code rối rắm).

# Câu lệnh sử dụng để chạy

- npm install winston

