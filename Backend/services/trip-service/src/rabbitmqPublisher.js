/**
 * rabbitmqPublisher.js
 *
 * ⚠️  trip-service KHÔNG sử dụng RabbitMQ.
 *
 * File này được tạo sẵn trong cấu trúc dự án nhưng để trống có chủ đích.
 *
 * Phân công message broker trong hệ thống:
 * ┌─────────────────┬─────────────────────────────────────────────────────┐
 * │ Service         │ Message Broker                                       │
 * ├─────────────────┼─────────────────────────────────────────────────────┤
 * │ trip-service    │ Kafka (search-events) — dùng kafkaPublisher.js       │
 * │ booking-service │ RabbitMQ (booking.paid) + Kafka (booking-events)     │
 * │ payment-service │ RabbitMQ (payment.result) + Kafka (payment-events)   │
 * │ ticket-worker   │ Consume RabbitMQ (booking.paid → sinh vé)            │
 * │ notif-worker    │ Consume RabbitMQ (ticket.issued → gửi email)         │
 * └─────────────────┴─────────────────────────────────────────────────────┘
 *
 * Tham khảo: note/READ/01-Create_Structure.md
 */
