# Task 02: Sơ đồ ghế (Seat Map)

## Mục tiêu
Render sơ đồ ghế linh hoạt theo loại xe (29 chỗ ngồi, 34 giường nằm, 22 limousine) và hiển thị trực quan các trạng thái của từng ghế.

## Chi tiết triển khai
- **File:** `src/components/trip/seat-map.tsx`
- **Công nghệ:** React (Client Component), Tailwind CSS, TypeScript.
- **Tính năng:**
  - Logic sinh dữ liệu ghế giả lập (mock data) thông qua `useEffect`, tự tính toán số ghế theo thuộc tính `busType` truyền vào (34, 29, 22).
  - Định nghĩa rõ kiểu dữ liệu `SeatStatus = "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED"`.
  - Hiển thị bảng chú giải (Legend) với các màu sắc trực quan: Trống (Trắng), Đang chọn (Xanh lá), Đang giữ (Cam), Đã bán (Xám), Bị khóa (Xám gạch chéo).
  - Tương tác chọn ghế: Người dùng click vào ghế `AVAILABLE` sẽ chuyển trạng thái sang Đang chọn (Selected).
  - Giới hạn quy tắc: Khách chỉ được chọn tối đa 6 ghế.
  - Tổng kết giá tiền ở dưới cùng (Checkout bar) bám dính màn hình (`sticky bottom-0`).

## Trạng thái
- Đã hoàn thành (Done).
- Giao diện sơ đồ hiển thị đẹp mắt và hỗ trợ tính toán giá vé theo thời gian thực khi người dùng chọn ghế.
