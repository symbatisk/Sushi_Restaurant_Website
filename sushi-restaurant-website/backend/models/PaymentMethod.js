const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  last4: {
    type: String,
    required: true
  },
  exp_month: {
    type: String,
    required: true
  },
  exp_year: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);