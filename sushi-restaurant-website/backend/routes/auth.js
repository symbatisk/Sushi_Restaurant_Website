const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    console.log("Registration request:", req.body);
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if user exists
    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPass = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPass 
    });
    
    // Save to database
    await newUser.save();

    // Success response
    res.status(201).json({ message: "Registration successful!" });
  } catch (err) {
    console.error("Registration error details:", err);
    res.status(500).json({ 
      error: "Server error", 
      message: err.message 
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    console.log("Login request:", req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error details:", err);
    res.status(500).json({ 
      error: "Server error", 
      message: err.message 
    });
  }
});

// Get profile
router.get("/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (err) {
    console.error("Token error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
});

// Update user settings
router.put("/update", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email } = req.body;

    // Optional: validate email format
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({ message: "User updated successfully", user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


module.exports = router;