# Task 01: Trang chi tiết chuyến đi

## Mục tiêu
Tạo trang web `/trips/[id]` để hiển thị chi tiết chuyến đi khi khách hàng bấm "Chọn ghế" từ trang danh sách tìm kiếm.

## Chi tiết triển khai
- **File:** `src/app/(public)/trips/[id]/page.tsx`
- **Công nghệ:** Next.js Server Component (hoặc Client nếu cần import các hook), Tailwind CSS.
- **Nội dung:** 
  - Phần Header: Hiển thị lại Điểm đi -> Điểm đến, Ngày giờ, Nhà xe và nút Quay lại (Back to Home).
  - Bố cục 2 cột (2-Column Layout): 
    - **Cột trái (1/3 màn hình):** Sử dụng Card của Shadcn UI để làm khung, hiển thị danh sách Lộ trình chi tiết (Điểm đón, Điểm trả, Giờ đón trả) và khối Chính sách nhà xe (Hủy vé, có mặt trước 30p...). Áp dụng design system màu sắc chủ đạo (#F95396).
    - **Cột phải (2/3 màn hình):** Chừa không gian render Component `SeatMap`.

## Trạng thái
- Đã hoàn thành (Done).
- Giao diện đáp ứng đúng yêu cầu tách bạch thông tin lịch trình và sơ đồ ghế giúp tối ưu trải nghiệm người dùng trên máy tính. Trên mobile tự động xếp chồng dọc.
