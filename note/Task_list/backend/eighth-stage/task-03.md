# Task 03: MCP Server (Model Context Protocol)

## 1. Nội dung công việc
Xây dựng `mcp-server` theo chuẩn Model Context Protocol để cho phép các AI Agent bên ngoài (như Cursor, Claude Desktop) kết nối và giao tiếp an toàn với hệ thống Đặt vé xe.

## 2. Ý nghĩa thực hiện của Task này
Tuân thủ nguyên tắc kiến trúc MCP:
- **Client Thông Minh & Bảo mật:** MCP Server không trực tiếp truy xuất Database, mà đóng vai trò như một Proxy chuẩn hóa. Khi Agent yêu cầu dữ liệu, MCP Server sẽ parse cấu trúc, gọi nội bộ qua gRPC (tới `trip-service`, `analytics-service`), đảm bảo mọi rule bảo mật và nghiệp vụ gốc được giữ nguyên.
- **Tách biệt Tools và Resources:**
  - `Resources` (`policy://cancellation`): Khai báo dữ liệu dạng Text/Read-only cho Agent đọc ngữ cảnh tĩnh.
  - `Tools` (`search_trips`, `get_revenue_summary`): Khai báo các hành động (Actions) yêu cầu parameter đầu vào. Agent gọi Tool để lấy dữ liệu động thời gian thực.
- Sử dụng Transport STDIO để tương tác cực kỳ nhẹ nhàng với Cursor / Claude Desktop (chỉ cần chạy lệnh Node).

## 3. Các file được tạo/chỉnh sửa
- `mcp-server/package.json`: Cài đặt thư viện `@modelcontextprotocol/sdk`.
- `mcp-server/src/server.js`: Khởi tạo MCP Server, cấu hình Handlers cho `ListResources`, `ReadResource`, `ListTools` và `CallTool`. Chạy trên stdio.
- `mcp-server/src/grpcClients.js`: Kết nối gRPC nội bộ đến các service khác để cung cấp dữ liệu thật.
