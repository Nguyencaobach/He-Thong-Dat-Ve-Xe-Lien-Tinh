/**
 * ticketGenerator.js - Sinh vé điện tử dạng HTML (Đặc tả 6.4)
 *
 * Mỗi booking có thể có nhiều ghế → sinh nhiều vé riêng biệt (1 vé / 1 ghế / 1 hành khách)
 *
 * Nội dung mỗi vé (theo đặc tả 6.4):
 * - Mã booking
 * - Mã vé (ticketId)
 * - Họ tên hành khách
 * - Tuyến xe (điểm đón → điểm trả)
 * - Ngày giờ khởi hành
 * - Số ghế
 * - Mã QR mô phỏng: chuỗi `{bookingCode}-{ticketId}` (dạng text, không cần thư viện QR)
 * - Chính sách check-in
 */

const fs   = require('fs');
const path = require('path');
require('dotenv').config();

const OUTPUT_DIR = process.env.TICKETS_OUTPUT_DIR || './generated-tickets';

/**
 * Sinh mã vé ngắn dễ đọc
 * Ví dụ: TKT-A01-20261015-ABCD
 */
function generateTicketId(bookingId, seatId) {
  const suffix = bookingId.substring(0, 4).toUpperCase();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TKT-${seatId.toUpperCase()}-${datePart}-${suffix}`;
}

/**
 * Sinh nội dung HTML cho 1 vé
 */
function renderTicketHtml({ ticketId, bookingId, passenger, seatId, seatNumber, tripInfo, qrCode }) {
  const passengerName = passenger?.full_name || passenger?.fullName || 'Khách';
  const passengerPhone = passenger?.phone || '---';
  const from = tripInfo?.from || tripInfo?.departure_location || 'Điểm đón';
  const to   = tripInfo?.to   || tripInfo?.arrival_location   || 'Điểm đến';
  const departAt = tripInfo?.depart_at || tripInfo?.departAt
    ? new Date(tripInfo.depart_at || tripInfo.departAt).toLocaleString('vi-VN')
    : '---';
  const busType = tripInfo?.bus_type || tripInfo?.busType || 'Xe khách';
  const price   = tripInfo?.price
    ? Number(tripInfo.price).toLocaleString('vi-VN') + ' ₫'
    : '---';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vé xe – ${ticketId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0f4f8;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 32px 16px;
    }
    .ticket {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      width: 480px;
      overflow: hidden;
    }
    .ticket-header {
      background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
      color: #fff;
      padding: 24px 28px;
    }
    .ticket-header h1 { font-size: 22px; font-weight: 700; }
    .ticket-header p  { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .ticket-body { padding: 24px 28px; }
    .route {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 18px;
      font-weight: 600;
      color: #1a1a2e;
    }
    .route-arrow { color: #1a73e8; font-size: 22px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }
    .info-item label {
      display: block;
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-item span {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a2e;
    }
    .divider {
      border: none;
      border-top: 1px dashed #d0d7e0;
      margin: 18px 0;
    }
    .qr-section {
      text-align: center;
      padding: 16px;
      background: #f8fafc;
      border-radius: 10px;
      margin-bottom: 18px;
    }
    .qr-code {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      background: #1a1a2e;
      color: #00e5ff;
      padding: 10px 18px;
      border-radius: 6px;
      display: inline-block;
      letter-spacing: 1px;
      margin-top: 8px;
      word-break: break-all;
    }
    .qr-label {
      font-size: 11px;
      color: #888;
      margin-top: 8px;
    }
    .policy {
      background: #fff8e1;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 12px;
      color: #7c5200;
      line-height: 1.6;
    }
    .ticket-footer {
      background: #f8fafc;
      padding: 14px 28px;
      border-top: 1px solid #e8edf2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #aaa;
    }
    .status-badge {
      background: #dcfce7;
      color: #166534;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <h1>🎫 Vé xe khách liên tỉnh</h1>
      <p>Mã booking: <strong>${bookingId.substring(0, 8).toUpperCase()}</strong></p>
    </div>

    <div class="ticket-body">
      <div class="route">
        <span>${from}</span>
        <span class="route-arrow">→</span>
        <span>${to}</span>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <label>Hành khách</label>
          <span>${passengerName}</span>
        </div>
        <div class="info-item">
          <label>Số điện thoại</label>
          <span>${passengerPhone}</span>
        </div>
        <div class="info-item">
          <label>Số ghế</label>
          <span>${seatNumber || seatId}</span>
        </div>
        <div class="info-item">
          <label>Loại xe</label>
          <span>${busType}</span>
        </div>
        <div class="info-item">
          <label>Ngày giờ khởi hành</label>
          <span>${departAt}</span>
        </div>
        <div class="info-item">
          <label>Giá vé</label>
          <span>${price}</span>
        </div>
      </div>

      <hr class="divider" />

      <div class="qr-section">
        <div style="font-size:13px;color:#555;font-weight:600;">Mã QR check-in</div>
        <div class="qr-code">${qrCode}</div>
        <div class="qr-label">Xuất trình mã này khi lên xe. Hợp lệ 1 lần duy nhất.</div>
      </div>

      <div class="policy">
        <strong>⚠️ Chính sách check-in:</strong><br/>
        • Có mặt tại điểm đón trước 15 phút giờ khởi hành.<br/>
        • Mang theo giấy tờ tùy thân khi lên xe.<br/>
        • Vé chỉ có giá trị 1 lần sử dụng.<br/>
        • Không hoàn vé khi xe đã khởi hành.
      </div>
    </div>

    <div class="ticket-footer">
      <span>Mã vé: <strong>${ticketId}</strong></span>
      <span class="status-badge">✓ ĐÃ THANH TOÁN</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sinh vé cho tất cả ghế trong một booking
 * @param {object} bookingPayload - Payload từ event booking.paid
 * @returns {Array} Danh sách vé đã sinh: [{ ticketId, seatId, htmlPath, qrCode, passengerName }]
 */
async function generateTickets(bookingPayload) {
  const {
    bookingId,
    tripId,
    seatIds,
    passengers = [],
    tripInfo   = {},
  } = bookingPayload;

  // Đảm bảo thư mục output tồn tại
  const outputDir = path.resolve(OUTPUT_DIR);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`[ticket-worker] Tạo thư mục vé: ${outputDir}`);
  }

  const tickets = [];

  for (let i = 0; i < seatIds.length; i++) {
    const seatId = seatIds[i];

    // Tìm passenger khớp với seatId (nếu có)
    const passenger = passengers.find((p) =>
      p.seat_id === seatId || p.seatId === seatId
    ) || passengers[i] || null;

    const ticketId = generateTicketId(bookingId, seatId);
    const qrCode   = `${bookingId.substring(0, 8).toUpperCase()}-${ticketId}`;

    const html = renderTicketHtml({
      ticketId,
      bookingId,
      passenger,
      seatId,
      seatNumber: passenger?.seat_number || passenger?.seatNumber || seatId,
      tripInfo: { ...tripInfo, tripId },
      qrCode,
    });

    // Lưu file HTML
    const fileName = `${ticketId}.html`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, html, 'utf8');

    tickets.push({
      ticketId,
      seatId,
      qrCode,
      htmlPath:      filePath,
      passengerName: passenger?.full_name || passenger?.fullName || 'Khách',
      passengerEmail: passenger?.email || null,
    });

    console.log(`[ticket-worker] ✓ Sinh vé: ${ticketId} (seat=${seatId}, passenger=${tickets[tickets.length-1].passengerName})`);
  }

  return tickets;
}

module.exports = { generateTickets };
