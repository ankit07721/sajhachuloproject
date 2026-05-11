const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const connectDB = require("./config/mongo.config.js");
const Subscription = require("./models/Subscription");

require("dotenv").config();

// --- NEW: VALIDATE ENVIRONMENT VARIABLES ---
const requiredEnv = ["MONGO_URI", "JWT_SECRET", "JWT_EXPIRE"];
const missingEnv = requiredEnv.filter((envVar) => !process.env[envVar]);
if (missingEnv.length > 0) {
  console.error(
    `FATAL ERROR: Missing required environment variables: ${missingEnv.join(
      ", ",
    )}`,
  );
  process.exit(1); // Exit if critical variables are not set
}

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers with cross-origin allowed for images
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
} // Logging
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5000, // limit each IP to 5000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:8080",
    ],
    credentials: true,
  }),
);

// Body parsing middleware - Note: express.json() is already called above,
// but these specific limit settings are fine if you need them.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from frontend directory
app.use(express.static("frontend"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes - ALL paths updated to include './routes/'
app.use("/api/auth", require("./routes/auth"));
app.use("/api/menu", require("./routes/menu"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/recommendations", require("./routes/recommendations"));
app.use("/api/location", require("./routes/location"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/reviews", require("./routes/review"));
app.use("/api/coupons", require("./routes/coupons"));
app.use("/api/cart", require("./routes/cart.js"));
app.use("/api/contact", require("./routes/contact.js"));
app.use("/api/chefs", require("./routes/chef"));
app.use("/api/chef", require("./routes/chefRoutes"));
app.use("/api/subscriptions", require("./routes/subscription"));
app.use("/api/payment", require("./routes/payment"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/notifications", require("./routes/notifications"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });

  const expired = await Subscription.expireOverdue();
  if (expired > 0)
    console.log(`[STARTUP] Expired ${expired} overdue subscriptions`);

  // Run every hour
  setInterval(async () => {
    await Subscription.expireOverdue();
  }, 3600000);
};

startServer();

module.exports = app;
