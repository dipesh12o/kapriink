const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const protect = async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided." });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the admin user
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({ message: "Not authorized, user not found." });
    }

    if (!admin.isActive) {
      return res.status(401).json({ message: "Account is disabled." });
    }

    // Verify token version for session invalidation
    if (decoded.tokenVersion !== admin.tokenVersion) {
      // Clear token cookie
      res.clearCookie("token");
      return res.status(401).json({ message: "Session expired due to security updates. Please log in again." });
    }

    req.user = admin;
    next();
  } catch (error) {
    console.error("JWT Auth error:", error.message);
    res.clearCookie("token");
    return res.status(401).json({ message: "Not authorized, token invalid." });
  }
};

module.exports = { protect };
