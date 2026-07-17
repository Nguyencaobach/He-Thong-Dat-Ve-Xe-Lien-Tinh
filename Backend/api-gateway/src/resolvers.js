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
const logService = require('./logService');
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

    popularTrips: async () => {
      const response = await clients.trip.GetPopularTrips({});
      return response.trips;
    },

    // ── SEAT (Module 2) ──
    getSeatMap: async (_, { tripId }) => {
      const trip = await clients.trip.GetTripDetails({ tripId });
      let seatLayout = null;
      if (trip && trip.busId) {
        try {
          const bus = await clients.admin.GetBus({ busId: trip.busId });
          seatLayout = bus.seatLayout;
        } catch (err) {
          console.error("Error fetching bus seatLayout in Gateway:", err.message);
        }
      }
      return await clients.seat.GetSeatMap({ tripId, seatLayout });
    },

    // ── BOOKING (Module 3) ──
    getBooking: async (_, { bookingId }) => {
      return await clients.booking.GetBooking({ bookingId });
    },

    myBookings: async (_, __, context) => {
      requireAuth(context);
      const result = await clients.booking.ListBookingsByUser({ userId: context.user.userId, limit: 50 });
      return result.bookings || [];
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

    listRoutes: async (_, args, context) => {
      requireAdmin(context);
      return await clients.trip.ListRoutes(args);
    },

    listAdminTrips: async (_, args, context) => {
      requireAdmin(context);
      return await clients.trip.ListAdminTrips(args);
    },

    listBuses: async (_, { status, limit, offset }, context) => {
      requireAdminOrStaff(context);
      return await clients.admin.ListBuses({ status: status || '', limit: limit || 20, offset: offset || 0 });
    },

    getBus: async (_, { busId }, context) => {
      // Cho phép mọi người xem thông tin bus (để hiển thị biển số xe trên vé)
      return await clients.admin.GetBus({ busId });
    },

    listStaffs: async (_, __, context) => {
      requireAdmin(context);
      return await authService.listStaffs();
    },
    
    listEventLogs: async (_, args, context) => {
      requireAdmin(context);
      return await logService.listLogs(args);
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

    createStaff: async (_, args, context) => {
      requireAdmin(context);
      const res = await authService.createStaff(args);
      logService.logEvent(context.user.email, 'CREATE', 'STAFF', { email: args.email });
      return res;
    },

    updateStaff: async (_, args, context) => {
      requireAdmin(context);
      const res = await authService.updateStaff(args);
      logService.logEvent(context.user.email, 'UPDATE', 'STAFF', { id: args.id, email: args.email });
      return res;
    },

    deleteStaff: async (_, args, context) => {
      requireAdmin(context);
      const res = await authService.deleteStaff(args);
      logService.logEvent(context.user.email, 'DELETE', 'STAFF', { id: args.id });
      return res;
    },
    
    deleteEventLogs: async (_, { date }, context) => {
      requireAdmin(context);
      const res = await logService.deleteLogsByDate(date);
      logService.logEvent(context.user.email, 'DELETE', 'LOGS', { date });
      return res;
    },

    // ── SEAT (Module 2) ──
    holdSeat: async (_, { tripId, seatId }, context) => {
      const userId = context.user?.userId ?? 'guest';
      return await clients.seat.HoldSeat({ tripId, seatId, userId });
    },

    releaseSeat: async (_, { tripId, seatId }, context) => {
      const userId = context.user?.userId ?? 'guest';
      return await clients.seat.ReleaseSeat({ tripId, seatId, userId });
    },

    // ── BOOKING (Module 3) ──
    createBooking: async (_, { tripId, seatIds, passengers }, context) => {
      const userId = context.user?.userId ?? '';
      return await clients.booking.CreateBooking({ userId, tripId, seatIds, passengers });
    },

    cancelBooking: async (_, { bookingId }, context) => {
      const userId = context.user?.userId ?? 'guest';
      return await clients.booking.CancelBooking({ bookingId, userId });
    },

    // ── PAYMENT (Module 3) ──
    processPayment: async (_, { bookingId, amount, paymentMethod }) => {
      return await clients.payment.ProcessPayment({ bookingId, amount, paymentMethod });
    },

    // ── ADMIN (Module 4) ──
    createRoute: async (_, args, context) => {
      requireAdmin(context);
      const res = await clients.trip.CreateRoute(args);
      logService.logEvent(context.user.email, 'CREATE', 'ROUTE', { routeId: res.id });
      return res;
    },

    updateRoute: async (_, args, context) => {
      requireAdmin(context);
      const res = await clients.trip.UpdateRoute(args);
      logService.logEvent(context.user.email, 'UPDATE', 'ROUTE', { routeId: res.id });
      return res;
    },

    deleteRoute: async (_, args, context) => {
      requireAdmin(context);
      const res = await clients.trip.DeleteRoute(args);
      logService.logEvent(context.user.email, 'DELETE', 'ROUTE', { routeId: args.id });
      return res;
    },

    createTrip: async (_, args, context) => {
      requireAdmin(context);
      const res = await clients.trip.CreateTrip(args);
      logService.logEvent(context.user.email, 'CREATE', 'TRIP', { tripId: res.id });
      return res;
    },

    updateTrip: async (_, args, context) => {
      requireAdmin(context);
      const res = await clients.trip.UpdateTrip(args);
      logService.logEvent(context.user.email, 'UPDATE', 'TRIP', { tripId: res.id });
      return res;
    },

    deleteTrip: async (_, args, context) => {
      requireAdmin(context);
      const res = await clients.trip.DeleteTrip(args);
      logService.logEvent(context.user.email, 'DELETE', 'TRIP', { tripId: args.id });
      return res;
    },

    manageTrip: async (_, args, context) => {
      requireAdmin(context);
      return await clients.admin.ManageTrip(args);
    },

    createBus: async (_, args, context) => {
      requireAdmin(context);
      const res = await clients.admin.CreateBus(args);
      logService.logEvent(context.user.email, 'CREATE', 'BUS', { busId: res.busId });
      return res;
    },

    updateBus: async (_, args, context) => {
      requireAdmin(context);
      const res = await clients.admin.UpdateBus(args);
      logService.logEvent(context.user.email, 'UPDATE', 'BUS', { busId: res.busId });
      return res;
    },

    deleteBus: async (_, { busId }, context) => {
      requireAdmin(context);
      const res = await clients.admin.DeleteBus({ busId });
      logService.logEvent(context.user.email, 'DELETE', 'BUS', { busId });
      return res;
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

  Trip: {
    companyName: async (trip) => {
      try {
        if (!trip.busId) return "BusTicketHub Express";
        const bus = await clients.admin.GetBus({ busId: trip.busId });
        return bus.name || "BusTicketHub Express";
      } catch (err) {
        return "BusTicketHub Express";
      }
    }
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
