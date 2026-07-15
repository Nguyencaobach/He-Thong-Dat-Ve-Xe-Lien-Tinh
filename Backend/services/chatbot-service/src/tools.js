const { tool } = require('ai');
const { z } = require('zod');
const { tripClient, bookingClient } = require('./grpcClients');

const searchTripsTool = tool({
  description: 'Tìm kiếm chuyến xe theo điểm đi, điểm đến và ngày khởi hành.',
  parameters: z.object({
    departure: z.string().describe('Điểm đi (ví dụ: Sài Gòn)'),
    destination: z.string().describe('Điểm đến (ví dụ: Đà Lạt)'),
    date: z.string().describe('Ngày khởi hành định dạng YYYY-MM-DD (ví dụ: 2026-10-15)'),
  }),
  execute: async ({ departure, destination, date }) => {
    try {
      console.log(`[chatbot-service] Gọi tool searchTrips: ${departure} -> ${destination} (${date})`);
      const result = await tripClient.SearchTrips({ departure, destination, date });
      
      if (!result.trips || result.trips.length === 0) {
        return { message: 'Không tìm thấy chuyến xe nào phù hợp.' };
      }
      
      // Lược bớt thông tin trả về cho AI để tránh quá tải context
      const simplifiedTrips = result.trips.map(t => ({
        tripId: t.id,
        departureTime: t.departureTime,
        arrivalTime: t.arrivalTime,
        price: t.price,
        status: t.status
      }));
      
      return { trips: simplifiedTrips };
    } catch (error) {
      console.error('[chatbot-service] Tool searchTrips lỗi:', error.message);
      // Giấu stack trace, trả thông báo thân thiện cho AI
      return { message: 'Hệ thống đang bận hoặc có lỗi kết nối khi tìm chuyến xe, vui lòng thử lại sau.' };
    }
  },
});

const getBookingStatusTool = tool({
  description: 'Tra cứu thông tin vé/đơn hàng. YÊU CẦU PHẢI CÓ ĐỦ MÃ ĐẶT CHỖ VÀ EMAIL.',
  parameters: z.object({
    bookingCode: z.string().describe('Mã đặt chỗ, 8 ký tự (ví dụ: A1B2C3D4)'),
    email: z.string().email().describe('Email của khách hàng đã dùng để đặt vé'),
  }),
  execute: async ({ bookingCode, email }) => {
    try {
      console.log(`[chatbot-service] Gọi tool getBookingStatus: ${bookingCode} (${email})`);
      const result = await bookingClient.GetBooking({ id: bookingCode });
      
      if (!result.booking) {
        return { message: 'Không tìm thấy thông tin mã đặt chỗ này.' };
      }
      
      // Xác thực permission: Nếu email không khớp, từ chối trả thông tin
      if (result.booking.email !== email) {
        return { message: 'Email không khớp với mã đặt chỗ. Từ chối cung cấp thông tin vì lý do bảo mật.' };
      }
      
      return {
        bookingId: result.booking.id,
        passengerName: result.booking.passengerName,
        totalAmount: result.booking.totalAmount,
        status: result.booking.status, // DRAFT, PENDING_PAYMENT, PAID, CANCELLED
      };
    } catch (error) {
      console.error('[chatbot-service] Tool getBookingStatus lỗi:', error.message);
      return { message: 'Không thể tra cứu thông tin vé lúc này, vui lòng thử lại sau.' };
    }
  },
});

module.exports = { searchTripsTool, getBookingStatusTool };
