/**
 * pubsub.js - Kênh Pub/Sub cho GraphQL Subscriptions
 *
 * Đây là "trạm phát sóng nội bộ" của API Gateway.
 * Khi seat-service phát tín hiệu "ghế A01 vừa bị giữ",
 * pubsub sẽ chuyển tín hiệu đó đến tất cả client đang
 * subscribe vào tripId tương ứng qua GraphQL Subscription.
 *
 * PubSub từ graphql-subscriptions dùng cho môi trường
 * đơn server (dev/demo). Production nên dùng RedisPubSub.
 */

const { PubSub } = require('graphql-subscriptions');

const pubsub = new PubSub();

// Tên kênh sự kiện — dùng chung giữa publisher và subscriber
const EVENTS = {
  SEAT_STATUS_UPDATED: 'SEAT_STATUS_UPDATED',
};

module.exports = { pubsub, EVENTS };
