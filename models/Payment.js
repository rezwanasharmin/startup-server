const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user_email: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  transaction_id: {
    type: String,
    required: true,
  },
  payment_status: {
    type: String,
    required: true,
  },
  paid_at: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
