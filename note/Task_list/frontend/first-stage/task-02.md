# Task 02: Khởi tạo Lõi GraphQL Client

## 1. Nội dung công việc
Xây dựng thư mục `src/lib/graphql/` chứa các file: `client.ts`, `documents.ts`, `types.ts`, `errors.ts`.

## 2. Ý nghĩa thực hiện
Thay vì sử dụng thư viện cồng kềnh như Apollo Client, chúng ta sử dụng Native Fetch của Next.js để tối ưu Server Components.
- `client.ts`: Hàm gọi API tuỳ chỉnh, tự động đính kèm Token từ Cookie và hỗ trợ tính năng revalidate/cache của Next.js.
- `types.ts`: Khai báo TypeScript chặt chẽ cho toàn bộ Data Model.
- `errors.ts`: Đồng bộ cách xử lý lỗi với GraphQLError.
- `documents.ts`: Tập hợp các Query/Mutation để tái sử dụng.

# Câu lệnh sử dụng
Không có lệnh tạo. Tuy nhiên, cần cài đặt thư viện `graphql` nếu dùng các tính năng nâng cao.
