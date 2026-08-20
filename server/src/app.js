const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const tattooRoutes = require("./routes/tattooRoutes");

const app = express();

// CORS config supporting HTTP-only cookies
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/tattoos", tattooRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err.stack);
  res.status(500).json({ message: "An internal server error occurred." });
});

module.exports = app;
