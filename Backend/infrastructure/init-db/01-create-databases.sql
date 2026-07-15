-- Tạo toàn bộ Database cho hệ thống Đặt vé xe liên tỉnh
-- File này được Postgres tự động chạy khi khởi động lần đầu
-- (đặt trong /docker-entrypoint-initdb.d/)

CREATE DATABASE trip_db;
CREATE DATABASE booking_db;
CREATE DATABASE admin_db;
CREATE DATABASE analytics_db;
CREATE DATABASE payment_db;
CREATE DATABASE users_db;
