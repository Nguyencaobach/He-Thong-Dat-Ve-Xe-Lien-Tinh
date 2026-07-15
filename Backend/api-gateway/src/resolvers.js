/**
 * resolvers.js - Xử lý logic điều hướng GraphQL → gRPC
 *
 * Nhờ promisifyClient trong grpcClients.js, mỗi Resolver chỉ cần:
 *   const result = await clients.trip.SearchTrips({ departure, destination, date })
 * Không còn callback hell hay new Promise() lặp đi lặp lại.
 */

const authService = require('./authService');
const { clients } = require('./grpcClients');
const { pubsub, EVENTS } = require('./pubsub');

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

    // ── ADMIN (Module 4) — chỉ ADMIN ──
    getDashboardStats: async (_, { date }, context) => {
      requireAdmin(context);
      return await clients.admin.GetDashboardStats({ date });
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
  },

  // ── SUBSCRIPTIONS (Module 2 - real-time seat updates) ──
  Subscription: {
    seatStatusUpdated: {
      subscribe: (_, { tripId }) =>
        pubsub.asyncIterator([EVENTS.SEAT_STATUS_UPDATED]),
      resolve: (payload) => payload.seatStatusUpdated,
    },
  },
};

module.exports = resolvers;
