const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { streamText } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { initRAG, findRelevantPolicies } = require('./ragPolicy');
const { searchTripsTool, getBookingStatusTool } = require('./tools');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Rate Limiting: Chống spam, tối đa 5 requests / 1 phút / 1 IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 5,
  message: { error: 'Bạn đã nhắn tin quá nhanh. Vui lòng đợi 1 phút trước khi tiếp tục.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Khởi tạo Google AI Provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// 3. API Endpoint /api/chat
app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Body phải chứa mảng messages' });
    }

    // Lấy câu hỏi cuối cùng của user để tìm RAG
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    let policyContext = '';
    
    if (lastUserMessage) {
      policyContext = await findRelevantPolicies(lastUserMessage.content);
    }

    // System Prompt chống ảo giác và tích hợp ngữ cảnh
    const systemPrompt = `Bạn là trợ lý AI ảo của Hệ thống đặt vé xe liên tỉnh.
Nhiệm vụ của bạn là tư vấn chuyến xe và giải đáp thắc mắc cho hành khách bằng tiếng Việt.

NGUYÊN TẮC QUAN TRỌNG:
1. Tuyệt đối không tự bịa ra thông tin chuyến xe, giá vé, hoặc thông tin đơn hàng.
2. Nếu khách hỏi về chuyến xe, hãy gọi tool 'searchTrips' để lấy dữ liệu thực tế.
3. Nếu khách tra cứu vé, hãy gọi tool 'getBookingStatus'. Nhớ yêu cầu khách cung cấp ĐỦ mã vé và email trước khi gọi tool.
4. Nếu dữ liệu trả về từ tool không có hoặc bị lỗi, hãy lịch sự báo cho khách biết.
5. Về chính sách, nội quy nhà xe, hãy chỉ dựa vào phần [NGỮ CẢNH CHÍNH SÁCH] bên dưới. Nếu câu hỏi nằm ngoài ngữ cảnh, hãy trả lời "Tôi chưa đủ thông tin để trả lời câu hỏi này".

[NGỮ CẢNH CHÍNH SÁCH BỔ SUNG TỰ ĐỘNG TỪ RAG]:
${policyContext || 'Không có dữ liệu chính sách nào liên quan được tìm thấy.'}
`;

    // Gọi AI SDK streamText
    const result = await streamText({
      model: google('gemini-1.5-pro'),
      messages,
      system: systemPrompt,
      tools: {
        searchTrips: searchTripsTool,
        getBookingStatus: getBookingStatusTool,
      },
      maxSteps: 3, // Cho phép AI gọi tool nhiều lần (multi-step)
    });

    // Pipe luồng (stream) trả về cho client
    result.pipeDataStreamToResponse(res);

  } catch (error) {
    console.error('[chatbot-service] Lỗi xử lý chat:', error.message);
    res.status(500).json({ error: 'Lỗi hệ thống AI, vui lòng thử lại sau.' });
  }
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, async () => {
  console.log(`[chatbot-service] ✓ API đang lắng nghe trên http://localhost:${PORT}`);
  // Khởi tạo RAG (Load file text và nhúng vector)
  await initRAG();
});
