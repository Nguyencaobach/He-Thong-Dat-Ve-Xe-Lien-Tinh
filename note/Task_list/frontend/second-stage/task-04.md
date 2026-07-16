# Task 04: Xây dựng Tính năng Tìm kiếm Chuyến xe

## 1. Nội dung công việc
- Tạo Component `src/components/trip/search-form.tsx` (Form tìm kiếm).
- Tạo Component `src/components/trip/trip-card.tsx` (Card chi tiết chuyến xe).
- Tạo trang `/trips` (`src/app/(public)/trips/page.tsx`) nhận dữ liệu tìm kiếm từ URL.

## 2. Ý nghĩa thực hiện
- **Search Form**: Cung cấp giao diện trực quan với các trường Điểm Đi, Điểm Đến, Ngày. Khi submit, nó đẩy các thông số này lên URL (`?from=...&to=...`) bằng `useRouter`.
- **Trips Page**: Trang Server Component tự động đọc `searchParams` từ URL để gọi API lấy danh sách chuyến xe phù hợp.
- **Trip Card**: Hiển thị rõ ràng nhà xe, loại xe, giờ đi/đến, giá vé (định dạng tiền tệ VNĐ), và số lượng chỗ trống hiện tại.

# Câu lệnh sử dụng
Không có lệnh.
