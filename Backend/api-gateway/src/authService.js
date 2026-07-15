/**
 * authService.js - Logic nghiệp vụ Authentication
 *
 * Đây là tầng "bộ não" của việc đăng ký / đăng nhập.
 * Nó gọi authRepository để lấy dữ liệu, sau đó xử lý logic
 * (hash password, kiểm tra mật khẩu, tạo JWT token).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./authRepository');
require('dotenv').config();

// Số vòng hash: 12 là mức an toàn phổ biến cho production
const SALT_ROUNDS = 12;

const authService = {
  /**
   * Task-04: Đăng ký tài khoản mới
   *
   * Luồng xử lý:
   * 1. Kiểm tra email đã tồn tại chưa
   * 2. Hash mật khẩu bằng bcrypt (không bao giờ lưu mật khẩu thô)
   * 3. Lưu user vào database
   * 4. Cấp JWT token ngay để user không cần đăng nhập lại
   */
  async register({ email, password, fullName, phone }) {
    // Bước 1: Kiểm tra email trùng lặp
    const existingUser = await authRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email này đã được đăng ký. Vui lòng dùng email khác.');
    }

    // Bước 2: Hash mật khẩu — bcrypt tự tạo salt ngẫu nhiên bên trong
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Bước 3: Lưu user vào database
    const newUser = await authRepository.create({
      email,
      passwordHash,
      role: 'CUSTOMER', // Mặc định khi đăng ký là CUSTOMER
      fullName,
      phone,
    });

    // Bước 4: Cấp JWT token để user dùng ngay
    const token = generateToken(newUser);

    return { token, user: newUser };
  },

  /**
   * Task-05: Đăng nhập
   *
   * Luồng xử lý:
   * 1. Tìm user theo email
   * 2. So sánh mật khẩu với bcrypt (không bao giờ so sánh thô)
   * 3. Nếu đúng, cấp JWT token
   */
  async login({ email, password }) {
    // Bước 1: Tìm user theo email
    const user = await authRepository.findByEmail(email);
    if (!user) {
      // Trả lỗi chung chung để tránh tiết lộ "email chưa đăng ký"
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    // Bước 2: So sánh mật khẩu nhập vào với hash đã lưu
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    // Bước 3: Cấp JWT token
    const token = generateToken(user);

    return { token, user };
  },

  /**
   * Lấy thông tin user hiện tại từ id (dùng cho query `me`)
   */
  async getMe(userId) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng.');
    }
    return user;
  },
};

/**
 * Hàm nội bộ: Tạo JWT Token
 *
 * Payload gồm: id, email, role — đủ để Middleware sau này
 * xác định người dùng là ai và có quyền gì mà không cần query DB lại.
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = authService;
