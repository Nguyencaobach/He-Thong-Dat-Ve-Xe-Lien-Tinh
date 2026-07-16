# Task 03: Khởi tạo Lớp API Trừu tượng

## 1. Nội dung công việc
Xây dựng thư mục `src/lib/api/` với các file `trips.ts`, `bookings.ts`, `admin.ts`.

## 2. Ý nghĩa thực hiện
Tách biệt hoàn toàn phần "gọi dữ liệu" ra khỏi "giao diện" (Components). Thay vì các React Component gọi trực tiếp GraphQL Client, chúng sẽ gọi các hàm như `getPopularTrips()` hay `searchTrips()`. Việc này giúp code UI sạch hơn và dễ bảo trì, test độc lập.

# Câu lệnh sử dụng
Không có lệnh.
