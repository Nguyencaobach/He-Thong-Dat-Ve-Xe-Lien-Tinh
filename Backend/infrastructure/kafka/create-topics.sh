#!/bin/bash

# Đợi Kafka khởi động xong
echo "Đang đợi Kafka khởi động..."
sleep 10

# Tạo các topic phân tích
echo "Tạo các topic cho Kafka..."
kafka-topics.sh --create --if-not-exists --bootstrap-server localhost:9092 --topic search-events --partitions 3 --replication-factor 1
kafka-topics.sh --create --if-not-exists --bootstrap-server localhost:9092 --topic booking-events --partitions 3 --replication-factor 1
kafka-topics.sh --create --if-not-exists --bootstrap-server localhost:9092 --topic payment-events --partitions 3 --replication-factor 1

echo "Hoàn tất tạo topic!"
