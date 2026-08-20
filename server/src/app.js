const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const tattooRoutes = require("./routes/tattooRoutes");

const app = express();

const whitelist = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://kapriink.vercel.app"
];
if (process.env.CLIENT_URL) {
  whitelist.push(process.env.CLIENT_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1 || whitelist.indexOf(origin.replace(/\/$/, "")) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
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
