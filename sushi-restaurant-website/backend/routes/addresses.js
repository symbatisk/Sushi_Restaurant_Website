const express = require("express");
const router = express.Router();
const Address = require("../models/Addresses");
const jwt = require("jsonwebtoken");

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

// GET /api/addresses - Get addresses for authenticated user
router.get("/", authenticateUser, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.userId }).sort({ isDefault: -1, createdAt: -1 });
    res.json(addresses);
  } catch (err) {
    console.error("Error fetching addresses:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST /api/addresses - Create a new address
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { name, line1, line2, city, postcode, phone, isDefault } = req.body;

    if (!name || !line1 || !city || !postcode || !phone) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    // If this is set as default, remove default from other addresses
    if (isDefault) {
      await Address.updateMany(
        { userId: req.userId }, 
        { $set: { isDefault: false } }
      );
    }

    const newAddress = new Address({
      userId: req.userId,
      name,
      line1,
      line2: line2 || "",
      city,
      postcode,
      phone,
      isDefault: isDefault || false
    });

    await newAddress.save();
    res.status(201).json(newAddress);
  } catch (err) {
    console.error("Error creating address:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT /api/addresses/:id - Update an address
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const addressData = req.body;
    
    // If this is set as default, remove default from other addresses
    if (addressData.isDefault) {
      await Address.updateMany(
        { userId: req.userId, _id: { $ne: req.params.id } }, 
        { $set: { isDefault: false } }
      );
    }
    
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      addressData,
      { new: true }
    );
    
    if (!updatedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }
    
    res.json(updatedAddress);
  } catch (err) {
    console.error("Error updating address:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});



// GET /api/addresses/:id - Get a single address by ID
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json(address);
  } catch (err) {
    console.error("Error fetching address:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// DELETE /api/addresses/:id - Delete an address
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const deleted = await Address.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    
    if (!deleted) {
      return res.status(404).json({ message: "Address not found" });
    }
    
    res.json({ message: "Address deleted successfully" });
  } catch (err) {
    console.error("Error deleting address:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;