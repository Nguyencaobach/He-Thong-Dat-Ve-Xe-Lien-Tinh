# Task 07: Thêm logic Cache vào Redis (`tripCache.js`)

## 1. Nội dung công việc
Viết `tripCache.js` tích hợp Redis cache vào luồng tìm kiếm chuyến với pattern Cache-Aside (Lazy Loading).

## 2. Ý nghĩa thực hiện của Task này
- **Cache-Aside Pattern:** Khi có request tìm kiếm:
  1. Kiểm tra Redis trước (HIT → trả ngay, không query DB)
  2. Nếu MISS → query DB → lưu vào Redis → trả kết quả
- **Key format theo đặc tả:** `search:{departure}:{destination}:{date}` — chuẩn hóa lowercase để tránh cache miss do viết hoa/thường khác nhau.
- **TTL 5 phút:** Ngắn đủ để số ghế còn trống không quá stale, nhưng đủ dài để giảm tải DB đáng kể trong giờ cao điểm tìm vé.
- **Error resilience:** Nếu Redis down, code bắt lỗi và trả `null` → service fallback về DB, không crash. Đây là nguyên tắc "cache không phải điểm lỗi đơn".

## 3. Các file được tạo/chỉnh sửa
- `src/tripCache.js` — `getSearchResult()`, `setSearchResult()`, `invalidateSearchCache()`, `quit()`

## 4. Câu lệnh sử dụng

```bash
# Kiểm tra cache trong Redis CLI:
redis-cli -h localhost -p 6379
# Sau khi tìm kiếm một lần:
KEYS search:*
GET "search:tp.hcm:đà lạt:2026-07-20"
TTL "search:tp.hcm:đà lạt:2026-07-20"  # Kết quả ~300
```
