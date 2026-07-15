/**
 * resolvers.js - Xử lý logic điều hướng GraphQL → gRPC (Updated: Giai đoạn 4)
 *
 * Thay đổi so với Giai đoạn 3:
 * - Subscription.seatStatusUpdated: Thêm filter theo tripId
 *   để mỗi client chỉ nhận sự kiện của chuyến họ đang xem,
 *   không nhận sự kiện của tất cả chuyến trong hệ thống.
 *
 * Nhờ promisifyClient trong grpcClients.js, mỗi Resolver chỉ cần:
 *   const result = await clients.trip.SearchTrips({ departure, destination, date })
 */

const authService = require('./authService');
const { clients } = require('./grpcClients');
const { pubsub, EVENTS } = require('./pubsub');
const { withFilter } = require('graphql-subscriptions');

// ── Helpers kiểm tra quyền ───────────────────────────────────────────────────
function requireAuth(context) {
  if (!context.user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
  }
}

function requireAdmin(context) {
  requireAuth(context);
  if (context.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác này. Yêu cầu role ADMIN.');
  }
}

// ADMIN hoặc STAFF đều được check-in (Đặc tả 7.2 điểm 6)
function requireAdminOrStaff(context) {
  requireAuth(context);
  if (!['ADMIN', 'STAFF'].includes(context.user.role)) {
    throw new Error('Chức năng này chỉ dành cho ADMIN hoặc STAFF.');
  }
}

// ── Resolvers ────────────────────────────────────────────────────────────────
const resolvers = {

  Query: {
    // ── AUTH ──
    me: async (_, __, context) => {
      requireAuth(context);
      return authService.getMe(context.user.userId);
    },

    // ── TRIP (Module 1) ──
    searchTrips: async (_, { departure, destination, date }) => {
      const response = await clients.trip.SearchTrips({ departure, destination, date });
      return response.trips;
    },

    getTripDetails: async (_, { tripId }) => {
      return await clients.trip.GetTripDetails({ tripId });
    },

    // ── SEAT (Module 2) ──
    getSeatMap: async (_, { tripId }) => {
      return await clients.seat.GetSeatMap({ tripId });
    },

    // ── BOOKING (Module 3) ──
    getBooking: async (_, { bookingId }) => {
      return await clients.booking.GetBooking({ bookingId });
    },

    // ── PAYMENT (Module 3) ──
    checkPaymentStatus: async (_, { transactionId }) => {
      return await clients.payment.CheckPaymentStatus({ transactionId });
    },

    // ── ADMIN (Module 4) — chỉ ADMIN/STAFF ──
    getDashboardStats: async (_, { date }, context) => {
      requireAdmin(context);
      return await clients.admin.GetDashboardStats({ date });
    },

    listBuses: async (_, { status, limit, offset }, context) => {
      requireAdminOrStaff(context);
      return await clients.admin.ListBuses({ status: status || '', limit: limit || 20, offset: offset || 0 });
    },

    getBus: async (_, { busId }, context) => {
      requireAdminOrStaff(context);
      return await clients.admin.GetBus({ busId });
    },
  },

  Mutation: {
    // ── AUTH ──
    register: async (_, args) => {
      return authService.register(args);
    },

    login: async (_, args) => {
      return authService.login(args);
    },

    // ── SEAT (Module 2) ──
    holdSeat: async (_, { tripId, seatId }, context) => {
      const userId = context.user?.userId ?? 'guest';
      return await clients.seat.HoldSeat({ tripId, seatId, userId });
    },

    // ── BOOKING (Module 3) ──
    createBooking: async (_, { tripId, seatIds }, context) => {
      const userId = context.user?.userId ?? '';
      return await clients.booking.CreateBooking({ userId, tripId, seatIds });
    },

    cancelBooking: async (_, { bookingId }, context) => {
      requireAuth(context);
      return await clients.booking.CancelBooking({ bookingId, userId: context.user.userId });
    },

    // ── PAYMENT (Module 3) ──
    processPayment: async (_, { bookingId, amount, paymentMethod }) => {
      return await clients.payment.ProcessPayment({ bookingId, amount, paymentMethod });
    },

    // ── ADMIN (Module 4) ──
    manageTrip: async (_, args, context) => {
      requireAdmin(context);
      return await clients.admin.ManageTrip(args);
    },

    createBus: async (_, { licensePlate, busType, totalSeats, status }, context) => {
      requireAdmin(context);
      return await clients.admin.CreateBus({ licensePlate, busType, totalSeats, status: status || 'ACTIVE' });
    },

    deleteBus: async (_, { busId }, context) => {
      requireAdmin(context);
      return await clients.admin.DeleteBus({ busId });
    },

    blockSeat: async (_, { tripId, seatId, reason }, context) => {
      requireAdmin(context);
      return await clients.admin.BlockSeat({ tripId, seatId, adminId: context.user.userId, reason: reason || '' });
    },

    unblockSeat: async (_, { tripId, seatId }, context) => {
      requireAdmin(context);
      return await clients.admin.UnblockSeat({ tripId, seatId, adminId: context.user.userId });
    },

    // Check-in: cả ADMIN và STAFF đều được (Đặc tả 7.2 điểm 6)
    checkIn: async (_, { qrCode, tripId, staffId }, context) => {
      requireAdminOrStaff(context);
      return await clients.admin.CheckIn({
        qrCode,
        tripId,
        staffId: staffId || context.user.userId,
      });
    },
  },

  // ── SUBSCRIPTIONS (Module 2 - real-time seat updates) ──────────────────────
  Subscription: {
    seatStatusUpdated: {
      /**
       * Filter: Chỉ gửi sự kiện đến client đang subscribe đúng tripId
       *
       * Nếu không có filter:
       * - Client xem chuyến A01 cũng sẽ nhận sự kiện ghế của chuyến B02, C03...
       * - Lãng phí bandwidth và gây nhầm lẫn
       *
       * withFilter(asyncIterator, filterFn):
       * - asyncIterator: Nguồn event (PubSub channel)
       * - filterFn: Hàm trả về true nếu event này cần gửi đến subscriber này
       *   - payload: Dữ liệu từ pubsub.publish(...)
       *   - variables: Tham số từ GraphQL Subscription query (ở đây là { tripId })
       */
      subscribe: withFilter(
        // Nguồn event — lắng nghe tất cả sự kiện SEAT_STATUS_UPDATED
        () => pubsub.asyncIterator([EVENTS.SEAT_STATUS_UPDATED]),
        // Filter: chỉ giữ lại sự kiện của đúng tripId mà client đang subscribe
        (payload, variables) => {
          return payload.seatStatusUpdated.tripId === variables.tripId;
        }
      ),
      // Resolve: Extract đúng object Seat từ payload để trả về cho client
      resolve: (payload) => payload.seatStatusUpdated,
    },
  },
};

module.exports = resolvers;
