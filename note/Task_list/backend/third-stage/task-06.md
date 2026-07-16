# Task 06: Viết logic `tripService.js` — Tìm chuyến xe theo Ngày và Tuyến

## 1. Nội dung công việc
Viết `tripService.js` và `tripRepository.js` xử lý logic tìm kiếm chuyến: tìm tuyến → tìm chuyến theo ngày → trả kết quả.

## 2. Ý nghĩa thực hiện của Task này
- **Luồng tìm kiếm 3 bước:** (1) Tìm `route` phù hợp từ cặp tỉnh đi/đến, (2) Tìm `trips` trong ngày đó theo `route_id`, (3) Map kết quả sang format `TripResponse` theo `trip.proto`.
- **Query join:** `tripRepository.findByRouteAndDate()` JOIN bảng routes để lấy tên tuyến, bến xe — tránh nhiều round-trip DB.
- **Filter thực tế:** Chỉ trả về chuyến còn chỗ trống (`available_seats > 0`) và đang ở trạng thái `SCHEDULED`.
- **mapToTripResponse():** Hàm chuẩn hóa dữ liệu DB sang format gRPC proto — tách biệt rõ ràng giữa DB model và API contract.

## 3. Các file được tạo/chỉnh sửa
- `src/tripRepository.js` — `findByRouteAndDate(routeId, date)`, `findById(id)`, `updateAvailableSeats(tripId, n)`
- `src/tripService.js` — `searchTrips(dep, dest, date)`, `getTripDetails(tripId)`

## 4. Câu lệnh sử dụng
Gọi thông qua gRPC từ api-gateway:
```graphql
query {
  searchTrips(departure: "TP.HCM", destination: "Đà Lạt", date: "2026-07-20") {
    tripId
    routeName
    departureTime
    price
    availableSeats
  }
}
```
