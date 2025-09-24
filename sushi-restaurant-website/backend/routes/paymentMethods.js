const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const jwt = require("jsonwebtoken"); 
const PaymentMethod = require("../models/PaymentMethod");

// Middleware для аутентификации пользователя
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

// GET /api/payment/user - Get payment methods for authenticated user
router.get("/user", authenticateUser, async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ userId: req.userId });
    res.json(methods);
  } catch (err) {
    console.error("Error fetching payment methods:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/payment - Create a new payment method
router.post("/", authenticateUser, async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.type || !req.body.last4 || !req.body.exp_month || !req.body.exp_year) {
      return res.status(400).json({ 
        message: "Missing required fields: type, last4, exp_month, exp_year" 
      });
    }

    const newMethod = new PaymentMethod({
      userId: req.userId,
      type: req.body.type,
      brand: req.body.brand || req.body.type,
      last4: req.body.last4,
      exp_month: req.body.exp_month,
      exp_year: req.body.exp_year,
      name: req.body.name || "Payment Card"
    });

    const saved = await newMethod.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating payment method:", err);
    res.status(400).json({ message: err.message });
  }
});

// GET /api/payment/:id - Get specific payment method
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const method = await PaymentMethod.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!method) return res.status(404).json({ message: "Payment method not found" });
    
    res.json(method);
  } catch (err) {
    console.error("Error fetching payment method:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/payment/:id - Update a payment method
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const updated = await PaymentMethod.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    
    if (!updated) return res.status(404).json({ message: "Payment method not found" });
    
    res.json(updated);
  } catch (err) {
    console.error("Error updating payment method:", err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/payment/:id - Delete a payment method
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const deleted = await PaymentMethod.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!deleted) return res.status(404).json({ message: "Payment method not found" });
    
    res.json({ message: "Payment method deleted" });
  } catch (err) {
    console.error("Error deleting payment method:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;