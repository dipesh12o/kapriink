const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const AuctionParticipant = require("../models/AuctionParticipant");

const protect = async (req, res, next) => {
  let token = req.cookies?.token;

  // Support Authorization: Bearer <token> header fallback
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

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

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to perform this action." });
    }
    next();
  };
};

const verifyBidder = async (req, res, next) => {
  let bidderToken = req.headers["x-bidder-token"] || req.body?.bidderToken;
  if (!bidderToken && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    bidderToken = req.headers.authorization.split(" ")[1];
  }

  if (!bidderToken) {
    return res.status(401).json({ message: "Verification required: Please verify your email before placing a bid." });
  }

  try {
    const decoded = jwt.verify(bidderToken, process.env.JWT_SECRET);
    if (!decoded.participantId || !decoded.email) {
      return res.status(401).json({ message: "Invalid bidder token format." });
    }

    const participant = await AuctionParticipant.findById(decoded.participantId);
    if (!participant) {
      return res.status(401).json({ message: "Bidder profile not found. Please verify your email." });
    }

    if (!participant.isVerified) {
      return res.status(403).json({ message: "Email not verified. Please complete verification before bidding." });
    }

    if (decoded.v !== undefined && decoded.v !== participant.tokenVersion) {
      return res.status(401).json({ message: "Bidder session expired. Please verify your email again." });
    }

    req.bidder = participant;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired bidder verification token." });
  }
};

module.exports = { protect, authorize, verifyBidder };
