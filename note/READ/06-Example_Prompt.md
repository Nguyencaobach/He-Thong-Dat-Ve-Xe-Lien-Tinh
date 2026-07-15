Bây giờ tôi muốn làm cái giai đoạn 4 trong 02-Task_List.md
## Giai đoạn 4: Module 2 - Seat Inventory Service (Kho ghế & Realtime)
- [ ] Khởi tạo kết nối Redis trong `seat-service` (Service này không xài Postgres). (task-01)
- [ ] Viết gRPC Server lắng nghe lệnh Giữ ghế / Lấy sơ đồ ghế. (task-02) 
- [ ] Cài đặt cơ chế **SETNX** trên Redis để giữ ghế nguyên tử (Atomic hold) kèm TTL 5 phút. (task-03)
- [ ] Viết logic nhả ghế (khi hết hạn TTL hoặc khách hủy). (task-04)
- [ ] Viết logic chốt ghế vĩnh viễn (chuyển sang trạng thái BOOKED khi đã thanh toán). (task-05)
- [ ] Phát sự kiện thay đổi trạng thái ghế lên kênh **Redis Pub/Sub** (`redisPubSub.js`). (task-06)
- [ ] Ở `api-gateway`, viết `seatEventsConsumer.js` lắng nghe Pub/Sub và đẩy dữ liệu về Frontend qua **GraphQL Subscriptions**. (task-07)



Bạn đọc kỹ yêu cầu của đặc tả Dac_ta_He_Thong.md rồi bạn hoàn thiện các task trong giai đoạn 4 này cho tôi nhé, đúng yêu cầu và không sai sót, sau khi làm xong thì bạn cập nhật theo mẫu của first-stage/Task_list/note trong thư mục hệ thống để làm phần task cho giai đoạn 4 này nhé bỏ giai đoạn 4 vào thư mục có sẵn tôi đã tạo là fourth-stage/Task_list/note, nêu trong giai đoạn này có cần chạy lệnh thì chạy thủ công tôi sẽ chạy cuối cùng nhé, sau khi làm xong thì cũng cập nhật các câu lệnh cần chạy lên đối với dự án mới tải từ git về vào file 05-Step_Begin.md có sẵn trong hệ thống luôn nhé