-- ============================================================
-- Script khởi tạo bảng cho users_db (Thuộc api-gateway)
-- ============================================================

\c users_db;

-- Tạo kiểu ENUM cho vai trò người dùng
CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');

-- Bảng users: Quản lý tài khoản đăng nhập
CREATE TABLE IF NOT EXISTS users (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          user_role     NOT NULL DEFAULT 'CUSTOMER',
    full_name     VARCHAR(255),
    phone         VARCHAR(20),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index tìm kiếm nhanh theo email (dùng khi đăng nhập)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- Dữ liệu mẫu (Seed Data)
-- ============================================================

-- Thêm tài khoản Admin mặc định (mật khẩu: 123456)
INSERT INTO users (email, password_hash, role, full_name, phone) 
VALUES (
    'admin@gmail.com', 
    '$2a$12$iv5J3/g.Of8Rtot8c2TchuukJViNXrWLYelUJeLNSO3T.NIfe7mne', 
    'ADMIN', 
    'System Admin', 
    '0987654321'
)
ON CONFLICT (email) DO NOTHING;
