# Roadmap Hoàn Thiện Frontend Hệ Thống Đặt Vé Xe Liên Tỉnh (Kiến trúc chuẩn)

Dưới đây là danh sách toàn bộ các task (công việc) phần Giao diện (Frontend) tuân thủ kiến trúc App Router, Server Actions và Custom Fetch GraphQL Client (không dùng thư viện ngoài cho gọi API).

---

## Giai đoạn 1: Nền tảng Kiến trúc, Cấu trúc thư mục & Middleware
- [x] Khởi tạo thư mục gốc: Tạo file `.env.local` cấu hình `BACKEND_GRAPHQL_URL`, `APP_URL`, `AUTH_COOKIE_NAME`.
- [ ] **Lõi GraphQL Client (`src/lib/graphql/`)**:
  - [x] `client.ts`: Viết Custom Fetch Client gọi tới Gateway (áp dụng Next.js cache/revalidate).
  - [x] `documents.ts`: Định nghĩa nguyên văn các chuỗi Query/Mutation.
  - [x] `types.ts`: Khai báo Type an toàn (TypeScript).
  - [x] `errors.ts`: Xử lý lỗi trả về chuyên biệt cho GraphQL.
- [x] **Lớp API Trừu tượng (`src/lib/api/`)**: Tạo các file `trips.ts`, `bookings.ts`, `admin.ts` chuyên gọi thông qua GraphQL Client.
- [x] **Quản lý Xác thực (`src/lib/auth/`)**: Tạo `session.ts` để đọc/ghi HTTP-only Cookie và truy xuất thông tin User/Token.
- [x] **Bảo vệ Định tuyến (Route Protection)**: Tạo file `src/middleware.ts` kiểm tra Cookie, tự động chặn và redirect về `/login` nếu truy cập `/admin` hoặc `/customer` trái phép.
- [x] Dựng bộ Layout Dùng chung trong `src/components/layout/`: `site-header.tsx`, `site-footer.tsx`, `admin-sidebar.tsx`.

## Giai đoạn 2: Module 1 - Xác thực & Trang công khai (Public Routes)
- [x] Thiết lập thư mục Route: `src/app/(public)` và `src/app/(auth)`.
- [x] **Trang Xác thực (`(auth)/login`, `(auth)/register`)**:
  - [x] Dựng UI Form với package `zod` validation.
  - [x] **Server Actions (`src/actions/auth.ts`)**: Viết logic `loginAction`, `registerAction`, thực hiện gán HTTP-only Cookie khi đăng nhập thành công.
- [x] **Trang Chủ (`(public)/page.tsx`)**: Giao diện Hero Banner, hiển thị danh sách Tuyến xe phổ biến.
- [x] **Tìm kiếm Chuyến xe (`(public)/trips`)**:
  - [x] Tạo UI Component `search-form.tsx` (Điểm đi/đến, ngày đi) có tính năng Autocomplete.
  - [x] Cụm UI Bộ lọc (Filter) & Sắp xếp (Sort): Tính năng lọc theo giờ đi, giá, nhà xe, loại xe và sắp xếp kết quả.
  - [x] Fetch dữ liệu chuyến từ Server Component, hiển thị bằng card `trip-card.tsx` (trong thư mục `src/components/trip/`).

## Giai đoạn 3: Module 2 - Sơ đồ ghế & Realtime (Cốt lõi)
- [x] Trang chi tiết chuyến (`(public)/trips/[id]/page.tsx`): Hiển thị thông tin tổng quan, điểm đón/trả.
- [x] **Sơ đồ ghế (`src/components/trip/seat-map.tsx`)**:
  - [x] Render linh hoạt theo template (29 chỗ ngồi / 34 giường nằm / 22 limousine).
  - [x] Áp dụng màu sắc cho trạng thái ghế: Trống, Đang chọn, Đang bị giữ, Đã bán, Bị khóa.
- [x] **Server Actions (`src/actions/seat.ts`)**: Viết logic gọi Mutation `holdSeats` (thông qua hàm Action từ Client) khi người dùng chọn ghế.
- [x] Giao diện **Đồng hồ đếm ngược**: Component Timer 5 phút trên UI, hết giờ tự reset trạng thái ghế đã chọn.
- [x] **Cập nhật Realtime**: Tích hợp cơ chế để Frontend nhận sự kiện ghế bị người khác chọn (qua Subscriptions hoặc Long-polling tối ưu) và đổi màu ngay lập tức trên màn hình.

## Giai đoạn 4: Module 3 - Đặt vé & Thanh toán (Checkout)
- [ ] **Form Hành khách (`src/components/booking/passenger-form.tsx`)**: Form điền Tên, SĐT, Email, render linh động theo số ghế, kết hợp validation.
- [ ] **Server Actions (`src/actions/booking.ts`)**: Viết `createBookingAction` nhận data từ Form để gọi GraphQL tạo Đơn hàng với trạng thái `PENDING_PAYMENT`.
- [ ] **Trang Thanh toán (`/checkout`)**: Hiển thị QR Code thanh toán mô phỏng và số tiền.
- [ ] Viết Server Action mô phỏng Thanh toán Thành công/Thất bại, thay đổi trạng thái Booking trong Database rồi Redirect.
- [ ] **Trang Tra cứu vé (`/ticket`)**: Khách nhập Mã Booking + Email -> Gọi API -> Trả về giao diện vé điện tử HTML.

## Giai đoạn 5: Module 4 - Khách hàng thân thiết & Admin Dashboard
- [ ] Khởi tạo thư mục: `src/app/(customer)` và `src/app/(admin)`.
- [ ] **Customer Dashboard (`(customer)/dashboard`)**:
  - [ ] Lấy danh sách Lịch sử đặt vé (`/customer/dashboard/bookings`).
  - [ ] Server Action thực hiện Hủy vé theo chính sách.
- [ ] **Admin Dashboard (`(admin)/dashboard`)**:
  - [ ] Lấy số liệu Analytics từ Backend, vẽ Biểu đồ Doanh thu (sử dụng thư viện Chart).
- [ ] **Admin Quản trị Dữ liệu (`(admin)/trips`, `(admin)/buses`)**: Bảng dữ liệu quản lý Route, Bus, Trip với chức năng thêm/sửa/xóa thông qua Server Actions.
- [ ] **Admin Sơ đồ ghế**: Click chọn ghế bất kỳ trên 1 chuyến xe và khóa lại (`BLOCKED`).
- [ ] **Staff Check-in**: Màn hình dành cho nhân viên điền Mã vé hoặc QR để đánh dấu `CHECKED_IN` hành khách lên xe.

## Giai đoạn 6: Tích hợp AI Chatbot
- [ ] Khởi tạo UI `floating-chatbot.tsx` (box chat thu gọn góc dưới màn hình).
- [ ] **API Route (`src/app/api/chat/route.ts`)**: Sử dụng `@ai-sdk/google` kết nối Gemini trả về streamText.
- [ ] Hiển thị dữ liệu dạng Streaming mượt mà.
- [ ] Xử lý Render UI từ Tool Call: Bắt event AI gọi hàm (ví dụ `searchTrips`), Frontend sẽ không in chữ mà vẽ hẳn Component `trip-card.tsx` hiển thị bên trong khung chat.

## Giai đoạn 7: Hoàn thiện & Tối ưu hóa
- [ ] Kiểm tra tính tương thích Đa thiết bị (Responsive Mobile/Tablet/Desktop).
- [ ] Tạo Component Loading (`loading.tsx`), Error (`error.tsx`), Not Found (`not-found.tsx`) cho mọi nhánh App Router.
- [ ] Tích hợp Toast notification (`sonner`) từ file `actions` phản hồi về giao diện.
- [ ] Cấu hình Next.js Metadata tự động (SEO động theo dữ liệu `trip`).
