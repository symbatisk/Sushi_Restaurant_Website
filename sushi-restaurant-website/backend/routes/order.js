const express = require("express");
const mongoose = require("mongoose");                 
const jwt = require("jsonwebtoken");
const router = express.Router();
const Order = require("../models/Order");
const Address = require("../models/Addresses"); 
const PaymentMethod = require("../models/PaymentMethod");

// Helper function to authenticate user
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; 
    next();
  } catch (err) {
    console.error("Token error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
};

// POST /api/order - Create a new order
router.post("/", authenticateUser, async (req, res) => {
  let order;
  try {
    const orderData = req.body;

    if (!orderData.items || !orderData.address || !orderData.payment) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: items, address, or payment" 
      });
    }

    const apiMinutes = orderData.delivery;
    const userId = req.userId || null;

    order = new Order({
      orderId: orderData.id,
      items: orderData.items,
      subtotal: orderData.subtotal,
      delivery: orderData.delivery,
      total: orderData.total,
      address: orderData.address,
      payment: orderData.payment,
      date: orderData.date ? new Date(orderData.date) : new Date(),
      prepTime: 20,
      deliveryTime: apiMinutes,
      totalETA: 20 + apiMinutes,
      customer: {
        userId: userId ? new mongoose.Types.ObjectId(userId) : null,
        name: `${orderData.address.first_name} ${orderData.address.last_name}`,
        email: orderData.address.contact_email
      }
    });

    // Save order
    await order.save();

    // Save address if user is authenticated
    if (userId) {
      const addressData = orderData.address;
      
      const existingAddress = await Address.findOne({
        userId: userId,
        line1: addressData.street || addressData.line1,
        city: addressData.city,
        postcode: addressData.zip_code || addressData.postcode
      });
      
      if (!existingAddress) {
        const newAddress = new Address({
        userId: userId,
        name: `${addressData.first_name} ${addressData.last_name}`,
        line1: addressData.street || addressData.line1,
        line2: addressData.line2 || "",
        city: addressData.city,
        postcode: addressData.zip_code || addressData.postcode,
        phone: addressData.phone_number || addressData.phone,
        isDefault: false
      });
        
        await newAddress.save();
      }
    }

    if (userId && orderData.payment) {
  try {
    // Проверяем, что все необходимые поля присутствуют
    if (orderData.payment.last4 && orderData.payment.exp_month && orderData.payment.exp_year) {
      // Check if payment method already exists
      const existingPaymentMethod = await PaymentMethod.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        last4: orderData.payment.last4,
        brand: orderData.payment.brand
      });
      
      if (!existingPaymentMethod) {
        const newPaymentMethod = new PaymentMethod({
          userId: new mongoose.Types.ObjectId(userId),
          type: orderData.payment.method,
          brand: orderData.payment.brand || orderData.payment.method,
          last4: orderData.payment.last4,
          exp_month: orderData.payment.exp_month,
          exp_year: orderData.payment.exp_year,
          name: orderData.payment.name || `${orderData.address.first_name} ${orderData.address.last_name}`
        });
        
        await newPaymentMethod.save();
        console.log("Payment method saved successfully");
      }
    } else {
      console.log("Incomplete payment data, skipping payment method save");
    }
  } catch (paymentError) {
    console.error("Error saving payment method:", paymentError);
    // Не прерываем выполнение из-за ошибки сохранения платежного метода
  }
}  
   res.json({
      success: true,
      message: "Order received and saved!",
      orderId: order.orderId,
      _id: order._id,
    });
  } catch (err) {
    console.error("Error saving order:", err);
    
    // Используем order только если он был определен
    const orderId = order ? order.orderId : "unknown";
    const order_id = order ? order._id : "unknown";
    
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message,
      orderId: orderId,
      _id: order_id
    });
  }
});
  


// GET /api/order/user - Get orders for authenticated user
router.get("/user", authenticateUser, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId); 
    const orders = await Order.find({ "customer.userId": userId }).sort({ createdAt: -1, date: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// GET /api/order - Get all orders (for admin purposes)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 , date: -1});
    res.json({ success: true, orders });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// GET /api/order/:id - Get specific order
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let order = null;
    if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderId: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    res.json({ success: true, order });
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// DELETE /api/order/:id - Delete an order
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const filterByOwner = { "customer.userId": req.userId };

    let deleted = null;
    if (mongoose.isValidObjectId(id)) {
      deleted = await Order.findOneAndDelete({ _id: id, ...filterByOwner });
    }
    if (!deleted) {
      deleted = await Order.findOneAndDelete({ orderId: id, ...filterByOwner });
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Order not found or not yours" });
    }

    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

module.exports = router;

