/**
 * emailSender.js - Giả lập gửi email vé cho hành khách (Đặc tả 6.3 điểm 7)
 *
 * Hai chế độ (cấu hình qua EMAIL_MODE):
 *
 * 1. "log" (mặc định, dùng cho dev):
 *    In đầy đủ nội dung email ra console — không cần cấu hình SMTP,
 *    không cần kết nối mạng, 100% offline.
 *
 * 2. "ethereal" (test nâng cao):
 *    Gửi qua Ethereal (https://ethereal.email) — email test miễn phí,
 *    có thể xem nội dung thật trên web, không bao giờ đến hộp thư thật.
 *
 * Tại sao không dùng Gmail/SMTP thật?
 * - Đây là hệ thống mô phỏng, không cần gửi email thật
 * - Tránh lộ credential, tránh spam filter
 * - Đặc tả ghi rõ: "gửi email mô phỏng hoặc ghi log"
 */
const nodemailer = require('nodemailer');
const fs         = require('fs');
require('dotenv').config();

const EMAIL_MODE = process.env.EMAIL_MODE || 'log';
const EMAIL_FROM = process.env.EMAIL_FROM || '"Hệ thống đặt vé xe" <noreply@bussystem.local>';

let transporter = null;

/**
 * Khởi tạo transporter (gọi 1 lần khi worker start)
 */
async function initTransporter() {
  if (EMAIL_MODE === 'ethereal') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || testAccount.user,
        pass: process.env.ETHEREAL_PASS || testAccount.pass,
      },
    });
    console.log('[notification-worker] ✓ Ethereal SMTP sẵn sàng:', testAccount.user);
  } else {
    // Chế độ log: dùng transporter giả (jsonTransport)
    transporter = nodemailer.createTransport({ jsonTransport: true });
    console.log('[notification-worker] ✓ Email ở chế độ LOG (không gửi thật)');
  }
}

/**
 * Tạo nội dung HTML email
 */
function renderEmailHtml({ recipientName, bookingId, tickets }) {
  const ticketRows = tickets.map((t) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.seatId}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.passengerName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;color:#1a73e8;">${t.ticketId}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${t.qrCode}</td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:'Segoe UI',sans-serif;background:#f0f4f8;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1a73e8,#0d47a1);padding:28px 32px;color:#fff;">
      <h1 style="margin:0;font-size:22px;">🎉 Đặt vé thành công!</h1>
      <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.</p>
    </div>
    <div style="padding:24px 32px;">
      <p style="color:#333;font-size:15px;">Xin chào <strong>${recipientName}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;">
        Đơn đặt vé <strong style="color:#1a73e8;">${bookingId.substring(0,8).toUpperCase()}</strong> 
        của bạn đã được xác nhận. Dưới đây là thông tin vé:
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:600;">Ghế</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:600;">Hành khách</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:600;">Mã vé</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:600;">Mã QR</th>
          </tr>
        </thead>
        <tbody>${ticketRows}</tbody>
      </table>
      <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:0 8px 8px 0;margin-top:20px;font-size:13px;color:#7c5200;">
        <strong>⚠️ Lưu ý quan trọng:</strong><br/>
        • Có mặt tại điểm đón <strong>trước 15 phút</strong> giờ khởi hành.<br/>
        • Mang theo giấy tờ tùy thân khi lên xe.<br/>
        • Mỗi vé chỉ sử dụng được 1 lần.
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e8edf2;text-align:center;font-size:12px;color:#aaa;">
      Email này được gửi tự động. Vui lòng không trả lời.<br/>
      © 2026 Hệ thống đặt vé xe khách liên tỉnh
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gửi email xác nhận đặt vé (giả lập)
 * @param {object} params
 * @param {string} params.to - Email người nhận
 * @param {string} params.recipientName - Tên người nhận
 * @param {string} params.bookingId
 * @param {Array}  params.tickets - Danh sách vé đã sinh
 */
async function sendBookingConfirmationEmail({ to, recipientName, bookingId, tickets }) {
  if (!transporter) await initTransporter();

  const subject = `✅ Xác nhận đặt vé – Mã booking ${bookingId.substring(0, 8).toUpperCase()}`;
  const html    = renderEmailHtml({ recipientName, bookingId, tickets });

  const mailOptions = {
    from:    EMAIL_FROM,
    to:      to || 'guest@example.com',
    subject,
    html,
  };

  if (EMAIL_MODE === 'log') {
    // Ghi log đầy đủ thay vì gửi thật
    console.log('\n' + '═'.repeat(60));
    console.log('[notification-worker] 📧 GIẢ LẬP GỬI EMAIL:');
    console.log(`  ► From:    ${EMAIL_FROM}`);
    console.log(`  ► To:      ${to || 'guest@example.com'}`);
    console.log(`  ► Subject: ${subject}`);
    console.log(`  ► Tickets: ${tickets.map((t) => t.ticketId).join(', ')}`);
    console.log(`  ► QR codes: ${tickets.map((t) => t.qrCode).join(' | ')}`);
    console.log('═'.repeat(60) + '\n');
    return { mode: 'log', success: true };
  }

  // Ethereal mode: gửi thật (nhưng email chỉ đến Ethereal, không đến hộp thư thật)
  try {
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[notification-worker] ✓ Email gửi thành công (Ethereal):`);
    console.log(`  ► Message ID: ${info.messageId}`);
    if (previewUrl) console.log(`  ► Xem tại: ${previewUrl}`);
    return { mode: 'ethereal', success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('[notification-worker] Lỗi gửi email:', err.message);
    throw err;
  }
}

module.exports = { initTransporter, sendBookingConfirmationEmail };
