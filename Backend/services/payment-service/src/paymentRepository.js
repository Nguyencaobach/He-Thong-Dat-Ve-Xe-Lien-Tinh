/**
 * paymentRepository.js - Lưu lịch sử transactions thanh toán
 */
const db = require('./db');

const paymentRepository = {
  async createTransaction({ bookingId, amount, paymentMethod, transactionId, status }) {
    const [tx] = await db('transactions').insert({
      booking_id:     bookingId,
      amount,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      status,
    }).returning('*');
    return tx;
  },

  async findByTransactionId(transactionId) {
    return db('transactions').where({ transaction_id: transactionId }).first();
  },

  async findByBookingId(bookingId) {
    return db('transactions').where({ booking_id: bookingId }).orderBy('created_at', 'desc');
  },
};

module.exports = paymentRepository;
