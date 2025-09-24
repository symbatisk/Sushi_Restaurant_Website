require("dotenv").config({ path: __dirname + '/.env' });

const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');
const path = require("path");

const authRoutes = require("./routes/auth");
const deliveryRoutes = require("./routes/delivery");
const orderRoutes = require("./routes/order");
const addressRoutes = require("./routes/addresses");
const paymentMethodRoutes = require("./routes/paymentMethods");

const app = express();

// CORS middleware
const allowedOrigins = [
  'http://localhost:3000', 
  'http://127.0.0.1:5500', 
  'http://localhost:5500', 
  'http://127.0.0.1:5501', 
  'http://localhost:5501',
  "https://sushi-restaurant-website.onrender.com"
];

app.use(express.static(path.join(__dirname, "../frontend")));

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  console.log(`${req.method} ${req.path} from origin ${req.headers.origin}`);
  next();
});

// app.use(cors({
//   origin(origin, cb) {
//     if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
//     return cb(new Error('Not allowed by CORS: ' + origin));
//   },
//   credentials: true
// }));

app.use(cors({
  origin: "*",
  credentials: true
}));

// Middlewares
app.use(express.json());

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("---------------------------------------------------");
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/payment", paymentMethodRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/home.html"));
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  })
  .catch(err => console.error("MongoDB error:", err));


console.log("Environment variables:");
console.log("MONGO_URI:", process.env.MONGO_URI ? "Set" : "Not set");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");
console.log("ORS_API_KEY:", process.env.ORS_API_KEY ? "Set" : "Not set");

if (!process.env.ORS_API_KEY) {
  console.warn("ORS_API_KEY is not set, delivery calculations will use fallback pricing");
}

