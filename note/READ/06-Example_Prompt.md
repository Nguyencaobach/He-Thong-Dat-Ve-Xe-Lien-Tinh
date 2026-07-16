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



Bây giờ tôi muốn viết luồng hoạt động và xử lý của các service để tôi có một cái nhìn tổng thể và chi tiết về cách chúng hoạt động để sao mà tôi có thể hiểu được hết, bạn sẽ cần giải thích theo các yêu cầu của tôi
1. Khi mà người dùng truy cập chức năng sẽ gọi qua api-gateway và sao để trỏ tới cái port của service đó
2. Theo đặc tả của hệ thống Dac_ta_He_Thong.md thì đối với mỗi service thì luồng xử lý là chạy như thế nào, công nghệ sử dụng ra sao, các file của service đó xử lý logic gọi nhau thế nào, rồi trả về kết quả cho giao diện thế nào, rồi các service giao tiếp với nhau thế nào, mỗi serivce sử lý ra như thế nào
3. Hiện tại các service nào đã có làm rồi thì bạn viết báo cáo còn chưa làm thì cứ để đó thôi đã

Tôi đã tạo một cái thư mục là Activity_stream có sẵn trong thư mục hệ thống để chứa các luồng hoạt động của từng service, đối với mỗi service bạn giải thích thì tạo một file md cho riêng một cái service đó nha

làm sao cho dễ hiểu, dễ đọc, đúng đặc tả nhé, bạn kham khảo thư mục Task_list để biết nội dung, trong quá trình viết báo cáo bạn cũng kiểm tra lại các service đã làm đúng với yêu cầu của đặc tả hết chưa nhé, đúng công nghệ sử dụng chưa


Bây giờ tôi muốn làm cái giai đoạn 3 trong 07-Frontend_Task_List.md


## Giai đoạn 3: Module 2 - Sơ đồ ghế & Realtime (Cốt lõi)
- [ ] Trang chi tiết chuyến (`(public)/trips/[id]/page.tsx`): Hiển thị thông tin tổng quan, điểm đón/trả. (task-01)
- [ ] **Sơ đồ ghế (`src/components/trip/seat-map.tsx`)**: (task-02)
  - [ ] Render linh hoạt theo template (29 chỗ ngồi / 34 giường nằm / 22 limousine).
  - [ ] Áp dụng màu sắc cho trạng thái ghế: Trống, Đang chọn, Đang bị giữ, Đã bán, Bị khóa.
- [ ] **Server Actions (`src/actions/seat.ts`)**: Viết logic gọi Mutation `holdSeats` (thông qua hàm Action từ Client) khi người dùng chọn ghế. (task-03)
- [ ] Giao diện **Đồng hồ đếm ngược**: Component Timer 5 phút trên UI, hết giờ tự reset trạng thái ghế đã chọn. (task-04)
- [ ] **Cập nhật Realtime**: Tích hợp cơ chế để Frontend nhận sự kiện ghế bị người khác chọn (qua Subscriptions hoặc Long-polling tối ưu) và đổi màu ngay lập tức trên màn hình. (task-05)

Bạn đọc kỹ yêu cầu của đặc tả Dac_ta_He_Thong.md thật kỹ để hiểu đúng cái yêu cầu của giai đoạn cần thực rồi bạn hoàn thiện các task trong giai đoạn 3 này cho tôi nhé, đúng yêu cầu và không sai sót, sau khi làm xong thì bạn cập nhật dựa theo mẫu của first-stage/frontend/Task_list/note trong thư mục hệ thống để làm phần task cho giai đoạn 3 này nhé sau đó bỏ task đã làm của giai đoạn 3 vào thư mục có sẵn tôi đã tạo là third-stage nằm trong thư mục frontend/Task_list/note có sẵn trong thư mục hệ thống, nêu trong giai đoạn này có cần chạy lệnh thì chạy thủ công tôi sẽ chạy cuối cùng nhé, sau khi làm xong thì cũng cập nhật các câu lệnh cần chạy lên đối với dự án mới tải từ git về vào file 05-Step_Begin.md có sẵn trong hệ thống luôn nhé



cho tôi hỏi cái dữ liệu ghế là lấy từ service luôn đúng không