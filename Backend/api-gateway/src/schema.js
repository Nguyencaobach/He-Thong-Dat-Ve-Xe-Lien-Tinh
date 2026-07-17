/**
 * schema.js - Định nghĩa GraphQL TypeDefs (Schema) cho toàn bộ hệ thống
 *
 * Đây là "bản hợp đồng" giữa Frontend và Backend:
 * - Frontend chỉ được phép hỏi những gì được định nghĩa ở đây
 * - Mỗi Query/Mutation ánh xạ trực tiếp với một Resolver sau này
 *
 * Cấu trúc dựa trên các file .proto đã định nghĩa gRPC interface:
 * - trip.proto    → SearchTrips, GetTripDetails
 * - seat.proto    → GetSeatMap, HoldSeat
 * - booking.proto → CreateBooking, GetBooking, CancelBooking
 * - payment.proto → ProcessPayment, CheckPaymentStatus
 * - admin.proto   → GetDashboardStats, ManageTrip
 */

const { gql } = require('graphql-tag');

const typeDefs = gql`
  # ─────────────────────────────────────────────
  # SCALAR & ENUM
  # ─────────────────────────────────────────────

  # Phân quyền người dùng theo RBAC (Mục 2 Đặc tả)
  enum Role {
    ADMIN
    STAFF
    CUSTOMER
  }

  # Trạng thái ghế (Module 2 - Đặc tả Mục 5.2)
  enum SeatStatus {
    AVAILABLE
    HELD
    BOOKED
    BLOCKED
  }

  # Trạng thái đơn đặt vé - state machine (Module 3 - Đặc tả Mục 6.2)
  enum BookingStatus {
    DRAFT
    PENDING_PAYMENT
    PAID
    TICKET_ISSUED
    CHECKED_IN
    COMPLETED
    EXPIRED
    CANCELLED
  }

  # ─────────────────────────────────────────────
  # AUTH TYPES
  # ─────────────────────────────────────────────

  type User {
    id: ID!
    email: String!
    role: Role!
    fullName: String
    phone: String
    createdAt: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  # ─────────────────────────────────────────────
  # TRIP TYPES (từ trip.proto)
  # ─────────────────────────────────────────────

  type Trip {
    tripId: ID!
    routeName: String!
    departureTime: String!
    arrivalTime: String!
    price: Float!
    availableSeats: Int!
    departureStation: String
    arrivalStation: String
    busType: String
    pickUpPoint: String
    dropOffPoint: String
    distance: Int
    status: String
    routeId: ID
    busId: ID
    companyName: String
  }

  type TripListResult {
    trips: [Trip!]!
    total: Int!
  }

  type Route {
    id: ID!
    name: String!
    departureProvince: String!
    arrivalProvince: String!
    departureStation: String!
    arrivalStation: String!
    distanceKm: Int!
    durationMinutes: Int!
    isActive: Boolean!
  }

  type RouteListResult {
    routes: [Route!]!
    total: Int!
  }

  # ─────────────────────────────────────────────
  # SEAT TYPES (từ seat.proto)
  # ─────────────────────────────────────────────

  type Seat {
    seatId: ID!
    seatNumber: String!
    status: SeatStatus!
    floor: Int
    row: Int
    col: Int
    type: String
  }

  type SeatMap {
    tripId: ID!
    seats: [Seat!]!
  }

  type HoldSeatResult {
    success: Boolean!
    message: String!
  }

  # ─────────────────────────────────────────────
  # BOOKING TYPES (từ booking.proto)
  # ─────────────────────────────────────────────

  type Booking {
    bookingId: ID!
    userId: ID
    tripId: ID!
    seatIds: [String!]!
    totalAmount: Float!
    status: BookingStatus!
    passengers: [Passenger!]
  }

  type Passenger {
    fullName: String!
    phone: String!
    email: String
    idNumber: String
    seatId: String!
    seatNumber: String!
  }

  type BookingResult {
    success: Boolean!
    bookingId: ID
    message: String!
  }

  input PassengerInput {
    fullName: String!
    phone: String!
    email: String
    idNumber: String
    seatId: String!
    seatNumber: String!
  }

  type CancelResult {
    success: Boolean!
    message: String!
  }

  # ─────────────────────────────────────────────
  # PAYMENT TYPES (từ payment.proto)
  # ─────────────────────────────────────────────

  type PaymentResult {
    success: Boolean!
    transactionId: ID
    message: String!
  }

  type PaymentStatus {
    status: String!
  }

  # ─────────────────────────────────────────────
  # ADMIN TYPES (từ admin.proto — Giai đoạn 7)
  # ─────────────────────────────────────────────

  type DashboardStats {
    totalBookings: Int!
    totalRevenue:  Float!
    activeUsers:   Int!
    totalTrips:    Int!
    totalBuses:    Int!
  }

  type ManageTripResult {
    success: Boolean!
    message: String!
  }

  type Bus {
    busId:        ID!
    name:         String!
    licensePlate: String!
    busType:      String!
    totalSeats:   Int!
    seatLayout:   String   # JSON string: cấu hình sơ đồ ghế
    status:       String!
    createdAt:    String
  }

  type BusListResult {
    buses: [Bus!]!
    total: Int!
  }

  type SimpleAdminResult {
    success: Boolean!
    message: String!
  }

  type CheckInResult {
    success:       Boolean!
    message:       String!
    bookingId:     ID
    passengerName: String
    seatNumber:    String
  }

  type EventLog {
    id: ID!
    userEmail: String
    action: String
    entity: String
    details: String
    createdAt: String
  }

  type EventLogListResult {
    logs: [EventLog!]!
    total: Int!
  }


  # ─────────────────────────────────────────────
  # QUERIES - Các truy vấn đọc dữ liệu
  # ─────────────────────────────────────────────

  type Query {
    # AUTH
    "Lấy thông tin người dùng đang đăng nhập (cần JWT token)"
    me: User

    # TRIP - Module 1
    "Tìm kiếm chuyến xe theo điểm đi, điểm đến, ngày (Module 1)"
    searchTrips(departure: String!, destination: String!, date: String!): [Trip!]!

    "Lấy danh sách các chuyến xe phổ biến (cho trang chủ)"
    popularTrips: [Trip!]!

    "Lấy chi tiết một chuyến xe cụ thể"
    getTripDetails(tripId: ID!): Trip

    # SEAT - Module 2
    "Lấy sơ đồ ghế của một chuyến xe (Module 2)"
    getSeatMap(tripId: ID!): SeatMap

    # BOOKING - Module 3
    "Tra cứu đơn đặt vé (guest: cần bookingId + email)"
    getBooking(bookingId: ID!): Booking

    "Lấy danh sách vé của khách hàng đang đăng nhập"
    myBookings: [Booking!]!

    # PAYMENT - Module 3
    "Kiểm tra trạng thái giao dịch thanh toán"
    checkPaymentStatus(transactionId: ID!): PaymentStatus

    # ADMIN - Module 4 (chỉ ADMIN/STAFF mới được gọi)
    "Dashboard thống kê cho Admin (Module 4)"
    getDashboardStats(date: String!): DashboardStats

    "Lấy danh sách tuyến xe (Admin)"
    listRoutes(page: Int, limit: Int): RouteListResult!

    "Lấy danh sách chuyến xe (Admin)"
    listAdminTrips(page: Int, limit: Int, date: String): TripListResult!

    "Lấy danh sách xe (Admin)"
    listBuses(status: String, limit: Int, offset: Int): BusListResult!

    "Lấy thông tin một xe"
    getBus(busId: ID!): Bus
    
    "Lấy danh sách nhân viên"
    listStaffs: [User!]!

    "Lấy danh sách log sự kiện"
    listEventLogs(page: Int, limit: Int, date: String): EventLogListResult!
  }

  # ─────────────────────────────────────────────
  # MUTATIONS - Các thao tác thay đổi dữ liệu
  # ─────────────────────────────────────────────

  type Mutation {
    # AUTH
    "Đăng ký tài khoản mới"
    register(email: String!, password: String!, fullName: String, phone: String): AuthPayload!

    "Đăng nhập, nhận JWT Token"
    login(email: String!, password: String!): AuthPayload!

    "Tạo nhân viên mới"
    createStaff(fullName: String!, email: String!, password: String!): User!
    
    "Cập nhật thông tin nhân viên"
    updateStaff(id: ID!, fullName: String!, email: String!, password: String): User!
    
    "Xóa nhân viên"
    deleteStaff(id: ID!): SimpleAdminResult!

    "Xóa log theo ngày cũ"
    deleteEventLogs(date: String!): SimpleAdminResult!

    # SEAT - Module 2
    # Trả về thành công hay không và có kèm token để tiếp tục thanh toán
    holdSeat(tripId: ID!, seatId: ID!): HoldSeatResult!

    # Nhả ghế
    releaseSeat(tripId: ID!, seatId: ID!): HoldSeatResult!

    # BOOKING - Module 3
    "Tạo đơn đặt vé mới (Saga orchestration bắt đầu từ đây)"
    createBooking(tripId: ID!, seatIds: [ID!]!, passengers: [PassengerInput!]): BookingResult!

    "Hủy đơn đặt vé (theo chính sách)"
    cancelBooking(bookingId: ID!): CancelResult!

    # PAYMENT - Module 3 (mô phỏng)
    "Giả lập thanh toán — dùng nút 'Thanh toán thành công/Thất bại'"
    processPayment(bookingId: ID!, amount: Float!, paymentMethod: String!): PaymentResult!

    # ADMIN - Module 4
    "Tạo tuyến xe mới (chỉ ADMIN)"
    createRoute(
      departureProvince: String!,
      arrivalProvince: String!,
      departureStation: String!,
      arrivalStation: String!,
      distanceKm: Int!,
      durationMinutes: Int!
    ): Route!

    "Cập nhật tuyến xe (chỉ ADMIN)"
    updateRoute(
      id: ID!,
      departureProvince: String!,
      arrivalProvince: String!,
      isActive: Boolean!
    ): Route!

    "Xóa tuyến xe (chỉ ADMIN)"
    deleteRoute(id: ID!): SimpleAdminResult!

    "Tạo chuyến xe (chỉ ADMIN)"
    createTrip(
      routeId: ID!,
      busId: ID!,
      busType: String,
      departureTime: String!,
      arrivalTime: String!,
      price: Float!,
      pickUpPoint: String,
      dropOffPoint: String,
      distance: Int,
      status: String,
      totalSeats: Int
    ): Trip!

    "Cập nhật chuyến xe (chỉ ADMIN)"
    updateTrip(
      id: ID!,
      routeId: ID!,
      busId: ID!,
      busType: String,
      departureTime: String!,
      arrivalTime: String!,
      price: Float!,
      pickUpPoint: String,
      dropOffPoint: String,
      distance: Int,
      status: String,
      totalSeats: Int
    ): Trip!

    "Xóa chuyến xe (chỉ ADMIN)"
    deleteTrip(id: ID!): SimpleAdminResult!

    "Thêm/Sửa/Xóa chuyến xe (chỉ ADMIN) - deprecated"
    manageTrip(action: String!, tripId: ID, routeName: String): ManageTripResult!

    "Tạo xe mới (chỉ ADMIN)"
    createBus(name: String, licensePlate: String!, busType: String!, totalSeats: Int!, seatLayout: String, status: String): Bus!

    "Cập nhật thông tin xe (chỉ ADMIN)"
    updateBus(busId: ID!, name: String, licensePlate: String, busType: String, totalSeats: Int, seatLayout: String, status: String): Bus!

    "Xóa xe (chỉ ADMIN)"
    deleteBus(busId: ID!): SimpleAdminResult!

    "Admin khóa ghế không bán cho một chuyến cụ thể (chỉ ADMIN)"
    blockSeat(tripId: ID!, seatId: ID!, reason: String): SimpleAdminResult!

    "Admin mở khóa ghế đã bị khóa (chỉ ADMIN)"
    unblockSeat(tripId: ID!, seatId: ID!): SimpleAdminResult!

    "Staff check-in hành khách bằng mã QR hoặc mã vé (ADMIN hoặc STAFF)"
    checkIn(qrCode: String!, tripId: ID!, staffId: String): CheckInResult!
  }

  # ─────────────────────────────────────────────
  # SUBSCRIPTIONS - Cập nhật thời gian thực (Module 2)
  # ─────────────────────────────────────────────

  type Subscription {
    "Theo dõi trạng thái ghế theo thời gian thực của một chuyến (Module 2)"
    seatStatusUpdated(tripId: ID!): Seat!
  }
`;

module.exports = typeDefs;
