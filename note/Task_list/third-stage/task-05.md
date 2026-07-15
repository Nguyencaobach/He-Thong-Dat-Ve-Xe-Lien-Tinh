# Task 05: Viết logic `routeService.js` — Autocomplete tìm kiếm điểm đi, điểm đến

## 1. Nội dung công việc
Viết `routeService.js` và `routeRepository.js` để xử lý tính năng autocomplete: khi người dùng gõ "đà" → gợi ý ["Đà Lạt", "Đà Nẵng"].

## 2. Ý nghĩa thực hiện của Task này
- **Autocomplete theo đặc tả:** Spec yêu cầu gợi ý tỉnh/thành và bến xe theo prefix. Dùng SQL `ILIKE '%keyword%'` trên cột `departure_province` và `arrival_province` — case-insensitive, hỗ trợ tiếng Việt.
- **UNION query:** Query lấy cả tỉnh đi lẫn tỉnh đến từ 1 câu lệnh, trả danh sách unique và có thể dùng cho cả 2 ô tìm kiếm.
- **Tách Repository / Service:** `routeRepository.js` chỉ query DB, `routeService.js` chứa business logic → dễ test độc lập, dễ thêm validation sau này.

## 3. Các file được tạo/chỉnh sửa
- `src/routeRepository.js` — `searchProvinces(keyword)`, `findRoute(dep, arr)`, `findById(id)`, `findAll()`
- `src/routeService.js` — `autocomplete(keyword)`, `getAllRoutes()`

## 4. Câu lệnh sử dụng
Logic này được gọi nội bộ khi Gateway gọi gRPC `SearchTrips`, không có endpoint riêng. Không cần lệnh chạy riêng.
