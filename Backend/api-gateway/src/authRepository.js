/**
 * authRepository.js - Tầng truy vấn Database cho Authentication
 *
 * Repository chỉ làm một việc: giao tiếp với PostgreSQL.
 * Không chứa logic nghiệp vụ — đó là việc của authService.js.
 */

const pool = require('./db');

const authRepository = {
  /**
   * Tìm user theo email
   * Dùng khi: đăng nhập, kiểm tra email đã tồn tại chưa
   */
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    // Trả về user đầu tiên tìm được, hoặc null nếu không có
    return result.rows[0] || null;
  },

  /**
   * Tìm user theo id
   * Dùng khi: giải mã JWT, lấy thông tin user hiện tại (query `me`)
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT id, email, role, full_name, phone, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Tạo user mới trong database
   * Dùng khi: đăng ký tài khoản
   */
  async create({ email, passwordHash, role = 'CUSTOMER', fullName, phone }) {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, full_name, phone, created_at`,
      [email, passwordHash, role, fullName || null, phone || null]
    );
    return result.rows[0];
  },
};

module.exports = authRepository;
