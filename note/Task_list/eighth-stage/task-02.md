# Task 02: Chatbot Service (Vercel AI SDK, Gemini & RAG)

## 1. Nội dung công việc
Xây dựng `chatbot-service` cung cấp API `/api/chat` đóng vai trò là trợ lý ảo AI thông minh, hỗ trợ tư vấn chuyến xe, tra cứu vé và giải đáp chính sách nhà xe.

## 2. Ý nghĩa thực hiện của Task này
Tuân thủ tuyệt đối **Kiến trúc WebAI và Bảo mật**:
- **Client thông minh:** Chatbot không kết nối trực tiếp với Database. Thay vào đó, nó định nghĩa các Tools (`searchTrips`, `getBookingStatus`) gọi qua gRPC tới `trip-service` và `booking-service`. Điều này đảm bảo AI phải tuân thủ mọi luồng logic và phân quyền có sẵn của hệ thống.
- **Tích hợp RAG (Retrieval-Augmented Generation):** Sử dụng model embedding của Google (`text-embedding-004`) để vector hóa `policy.txt`. Khi khách hỏi về chính sách, AI tự động dùng `cosineSimilarity` tìm ra đoạn nội quy liên quan nhất nhét vào System Prompt.
- **Chống Ảo giác (Hallucination):** System Prompt được thiết kế bắt buộc AI trả lời "chưa đủ thông tin" thay vì tự bịa ra chính sách hoặc lịch trình ảo.
- **Bảo mật và Quota:** Tích hợp `express-rate-limit` chặn ngay các IP spam tin nhắn (quá 5 tin/phút) để bảo vệ tài khoản API Gemini không bị cạn tiền (Quota Drain).

## 3. Các file được tạo/chỉnh sửa
- `chatbot-service/package.json` & `.env`: Cấu hình API key Gemini.
- `chatbot-service/src/server.js`: API chính, setup Rate Limiter và `streamText`.
- `chatbot-service/src/tools.js`: Định nghĩa các Tools với Zod Schema chuẩn xác.
- `chatbot-service/src/ragPolicy.js`: Logic chunking và vector embedding văn bản nội quy.
- `chatbot-service/src/grpcClients.js`: Giao tiếp gRPC nội bộ.
- `chatbot-service/data/policy.txt`: Dữ liệu tĩnh làm RAG.
