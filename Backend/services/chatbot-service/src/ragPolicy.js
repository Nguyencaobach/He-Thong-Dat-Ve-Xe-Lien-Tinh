const fs = require('fs');
const path = require('path');
const { embedMany, embed, cosineSimilarity } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
require('dotenv').config();

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Sử dụng model embedding của Google
const embeddingModel = google.textEmbeddingModel('text-embedding-004');

let policyEmbeddings = [];
let isReady = false;

async function initRAG() {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY === 'YOUR_GEMINI_KEY_HERE') {
      console.warn('[chatbot-service] Bỏ qua khởi tạo RAG vì chưa có GOOGLE_GENERATIVE_AI_API_KEY hợp lệ.');
      return;
    }
    const filePath = path.join(__dirname, '../data/policy.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Tách thành từng đoạn văn bản (chunking đơn giản qua dấu \n\n hoặc các số thứ tự)
    // Ở đây ta tách theo từng điều khoản chính
    const chunks = content.split('\n\n').filter(c => c.trim().length > 0);
    
    console.log(`[chatbot-service] Bắt đầu nhúng (embedding) ${chunks.length} đoạn chính sách...`);
    
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks,
    });
    
    policyEmbeddings = embeddings.map((e, i) => ({
      content: chunks[i],
      embedding: e,
    }));
    
    isReady = true;
    console.log('[chatbot-service] ✓ RAG Khởi tạo thành công.');
  } catch (err) {
    console.error('[chatbot-service] Lỗi khởi tạo RAG:', err.message);
  }
}

async function findRelevantPolicies(question) {
  if (!isReady) return ''; // Nếu chưa ready, trả về rỗng
  
  try {
    const { embedding } = await embed({
      model: embeddingModel,
      value: question,
    });
    
    // Tính độ tương đồng
    const scoredChunks = policyEmbeddings.map(chunk => ({
      content: chunk.content,
      score: cosineSimilarity(embedding, chunk.embedding),
    }));
    
    // Sắp xếp giảm dần và lấy top 2 đoạn liên quan nhất
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 2).filter(c => c.score > 0.6); // Lọc các kết quả có độ tương đồng > 0.6
    
    if (topChunks.length === 0) return '';
    return topChunks.map(c => c.content).join('\n\n');
  } catch (err) {
    console.error('[chatbot-service] Lỗi tìm kiếm RAG:', err.message);
    return '';
  }
}

module.exports = { initRAG, findRelevantPolicies };
