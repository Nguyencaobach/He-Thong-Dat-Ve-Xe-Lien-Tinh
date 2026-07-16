# Cấu hình Frontend (Next.js & Shadcn UI)

Tài liệu này ghi lại toàn bộ quá trình khởi tạo và cấu hình thư mục `frontend` cho Hệ thống Đặt vé xe liên tỉnh, tuân thủ theo chuẩn công nghệ và giao diện yêu cầu.

## 1. Khởi tạo dự án Next.js
Chạy lệnh sau tại thư mục gốc của toàn bộ dự án (`d:\Do_an_Website`):
```bash
npx create-next-app@latest frontend --src-dir --use-npm --tailwind --eslint --app
```
*(Lưu ý: Bắt buộc phải đặt tên thư mục viết thường toàn bộ như `frontend` do quy định mới của NPM không cho phép viết hoa tên project trong package.json).*

## 2. Di chuyển vào thư mục làm việc
Tất cả các lệnh cài đặt thư viện tiếp theo bắt buộc phải chạy bên trong thư mục `frontend` vừa tạo:
```bash
cd frontend
```

## 3. Khởi tạo Thư viện giao diện Shadcn UI
```bash
npx shadcn@latest init
```
**Khi có thông báo (Prompt) hiện lên, chọn các cấu hình sau:**
- **Component library:** Chọn `Radix` (Sử dụng các core components của Radix Primitives).
- **Preset:** Chọn `Vega`.
- **Base color:** Giữ nguyên mặc định (hoặc chọn Slate).
- Các câu hỏi phụ khác: Bấm `Enter` để đồng ý (Yes).

## 4. Bổ sung các Component thông dụng
Để phục vụ cho giao diện Đặt vé, Bảng điều khiển (Dashboard) của Admin, cài đặt sẵn một số UI Component quan trọng của Shadcn:
```bash
npx shadcn@latest add card input label badge table alert separator skeleton sonner
```

## 5. Cài đặt thư viện phụ trợ
Cài đặt `zod` để thực hiện Validation (kiểm tra tính hợp lệ của dữ liệu) cho các Form điền thông tin khách hàng, form tìm kiếm chuyến xe:
```bash
npm i zod
```

## 6. Thiết lập Biến môi trường
Tạo file `.env.local` ở ngay bên trong thư mục `frontend` để kết nối với `api-gateway` của Backend:

```env
BACKEND_GRAPHQL_URL=http://localhost:4000/graphql
APP_URL=http://localhost:3000
AUTH_COOKIE_NAME=access_token
```

## 7. Khởi tạo Cấu trúc thư mục (App Router)
Tạo sẵn bộ khung thư mục cho các trang hiển thị công khai (Public). Do đây là hệ thống bán vé xe, chúng ta sẽ tạo route cho danh sách chuyến xe (`trips`).

**Dùng lệnh trong PowerShell:**
```powershell
New-Item -Path "src/app/(public)/trips/[id]" -ItemType Directory -Force
```

**Dùng lệnh trong Git Bash (hoặc Linux/Mac):**
```bash
mkdir -p "src/app/(public)/trips/[id]"
```

---
**Hoàn tất!**
Lúc này anh có thể chạy lệnh `npm run dev` để bật server giao diện lên và truy cập thử vào `http://localhost:3000`.







# Kiến trúc Frontend: Next.js App Router & Custom GraphQL Client

Tài liệu này giải thích chi tiết cấu trúc thư mục của dự án Frontend (`d:\frontend`), vai trò của từng thành phần, và cách luồng dữ liệu (Data flow) hoạt động trong hệ thống hiện tại.

---

## 1. Tổng quan Kiến trúc

Dự án Frontend được xây dựng trên bộ khung **Next.js 14+ (App Router)**.
- **Server-First:** Theo mặc định, mọi Component đều là Server Components, giúp website tải siêu tốc và tối ưu SEO.
- **Server Actions:** Hàm backend gọi trực tiếp từ các sự kiện UI để xử lý form an toàn.
- **Custom GraphQL Client:** Không sử dụng Apollo, tự xây dựng hàm `fetch` chuyên biệt tận dụng sức mạnh Caching của Next.js.

---

## 2. Sơ đồ Cấu trúc Thư mục Hiện tại

Dưới đây là sơ đồ toàn bộ các file đang có trong thư mục `src` của Frontend:

```text
src/
|-- middleware.ts               # (Middleware) Người Gác Cổng: Chặn các truy cập trái phép vào /admin hoặc /customer
|   
|-- app/                        # (Hệ thống Định tuyến) Chứa các trang hiển thị
|   |-- favicon.ico             # Biểu tượng của trang web
|   |-- globals.css             # File CSS tổng, cấu hình biến màu sắc cho giao diện (Shadcn UI)
|   |-- layout.tsx              # Root Layout: Khung sườn gốc bọc quanh tất cả các trang
|       
|-- components/                 # (Các mảnh ghép Giao diện)
|   |-- layout/                 # Layout dùng chung
|   |   |-- admin-sidebar.tsx   # Sidebar menu cho phân hệ Quản trị viên
|   |   |-- site-footer.tsx     # Chân trang (Footer) chung cho khách hàng
|   |   |-- site-header.tsx     # Thanh điều hướng (Header) chung cho khách hàng
|   |       
|   |-- ui/                     # UI Component nguyên bản sinh ra bởi Shadcn UI
|       |-- alert.tsx           # Hộp thoại cảnh báo
|       |-- badge.tsx           # Nhãn trạng thái (Ví dụ: Đã thanh toán)
|       |-- button.tsx          # Nút bấm cơ bản
|       |-- card.tsx            # Thẻ hiển thị thông tin
|       |-- input.tsx           # Ô nhập liệu
|       |-- label.tsx           # Tiêu đề ô nhập liệu
|       |-- separator.tsx       # Đường kẻ ngang phân cách
|       |-- skeleton.tsx        # Khung tải giả (loading)
|       |-- sonner.tsx          # Bảng thông báo góc màn hình (Toast)
|       |-- table.tsx           # Bảng hiển thị dữ liệu (Data Table)
|           
|-- lib/                        # (Lõi Tiện ích & Kết nối Backend)
    |-- utils.ts                # Các hàm tiện ích dùng chung (do Shadcn tự sinh ra, gom class CSS)
    |   
    |-- api/                    # Lớp API Trừu tượng: Chứa hàm gọi data
    |   |-- admin.ts            # Hàm gọi thống kê cho Admin
    |   |-- bookings.ts         # Hàm xử lý đặt vé
    |   |-- trips.ts            # Hàm tìm kiếm/lấy danh sách chuyến xe
    |       
    |-- auth/                   
    |   |-- session.ts          # Quản lý phiên đăng nhập: Đọc/Ghi HTTP-only Cookie và giải mã JWT
    |       
    |-- graphql/                # Lõi giao tiếp với Cổng GraphQL (Gateway 4000)
        |-- client.ts           # Cấu hình Custom Fetch GraphQL (Tự động gắn Token & xử lý Cache)
        |-- documents.ts        # Định nghĩa các chuỗi Query/Mutation bằng văn bản (SearchTrips, Login...)
        |-- errors.ts           # File bẫy lỗi riêng cho GraphQL, chuyển hóa thành thông báo dễ hiểu
        |-- types.ts            # TypeScript interface cho dữ liệu vé xe (Trip, User, Booking...)
```

Ngoài ra, tại thư mục gốc `d:\frontend` còn có một file rất quan trọng:
- `.env.local`: Chứa biến môi trường bảo mật (`BACKEND_GRAPHQL_URL=http://localhost:4000/graphql`, `AUTH_COOKIE_NAME=access_token`).

---

## 3. Luồng hoạt động (How it runs)

**Ví dụ 1: Khách hàng tìm chuyến xe (Đọc dữ liệu - Query)**
1. Khách hàng vào trang `/trips`, nhập Sài Gòn -> Đà Lạt.
2. Trang gọi hàm `searchTrips()` trong `src/lib/api/trips.ts`.
3. Hàm này mượn `fetchGraphQL()` (`src/lib/graphql/client.ts`) bắn truy vấn sang Port 4000.
4. Dữ liệu mảng chuyến xe trả về được Frontend Cache lại (nếu cấu hình) và dựng thành HTML. Tốc độ hiển thị siêu nhanh!

**Ví dụ 2: Khách hàng bấm Đăng nhập (Ghi dữ liệu - Mutation)**
1. Khách nhập email/pass tại form ở `/login`. Form này gọi Action chạy ngầm trên Server.
2. Server gọi `fetchGraphQL` với mutation Login.
3. Nếu thành công, Backend trả về Token. File `src/lib/auth/session.ts` dùng hàm `setSession()` cất Token này vào HTTP-only Cookie an toàn.
4. Next.js chuyển hướng khách vào trang trong. Kể từ giờ, `src/middleware.ts` sẽ đọc Cookie này để phân quyền mọi truy cập.
