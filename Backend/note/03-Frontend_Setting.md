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
