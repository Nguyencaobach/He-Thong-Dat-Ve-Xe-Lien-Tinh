# Task 02: Định nghĩa `workspaces` trong `package.json` ở thư mục gốc

## 1. Nội dung công việc
Khởi tạo file `package.json` tại thư mục `Backend` và khai báo tính năng **NPM Workspaces** để quản lý kiến trúc Monorepo.

## 2. Ý nghĩa thực hiện của Task này
- **Quy về một mối:** Biến thư mục `Backend` thành một "tổng công ty" quản lý toàn bộ 10 "công ty con" (Microservices) bên trong. 
- **Tối ưu ổ cứng & RAM:** Thay vì cài Node_modules 10 lần ở 10 thư mục khác nhau, lệnh `npm install` chỉ chạy 1 lần ở ngoài cùng, tải chung các thư viện (như `express`, `knex`) về một chỗ rồi chia sẻ ngược vào trong.
- **Dùng chung code dễ dàng:** Cho phép các service có thể import code của nhau (ví dụ thư mục `packages/common-utils`) giống hệt như đang dùng một thư viện xịn xò tải từ trên mạng về.

# Câu lệnh sử dụng để chạy

- npm install

