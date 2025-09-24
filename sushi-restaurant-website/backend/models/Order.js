const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true }, 
  items: { type: Object, required: true }, 
  subtotal: { type: Number, required: true },
  delivery: { type: Number, required: true },
  total: { type: Number, required: true },
  address: { type: Object, required: true },
  payment: { type: Object, required: true },
  date: { type: Date, required: true },
  status: { type: String, default: "pending" },
  prepTime: { type: Number, default: 20 },       // фиксированное время приготовления
  deliveryTime: { type: Number, required: true }, // API вернёт минуты доставки
  totalETA: { type: Number, required: true }, 
  customer: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    name: String,
    email: String,
  },
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;