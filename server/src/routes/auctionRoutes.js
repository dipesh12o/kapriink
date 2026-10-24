const express = require("express");
const multer = require("multer");
const { protect, authorize, verifyBidder } = require("../middleware/authMiddleware");
const { verificationLimiter, bidLimiter } = require("../middleware/rateLimiter");
const {
  getPublicAuctions,
  getPublicAuctionById,
  getPublicAuctionBids,
  requestVerification,
  verifyEmail,
  placeBid,
  getAdminAuctions,
  getAdminAuctionById,
  createPainting,
  updatePainting,
  publishAuction,
  unpublishAuction,
  cancelAuction,
  markAuctionSold,
  deletePainting,
  getAdminAuctionBids
} = require("../controllers/auctionController");

// Multer memory storage config (max 10MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ==========================================
// PUBLIC ROUTER: /api/auctions
// ==========================================
const publicRouter = express.Router();

publicRouter.get("/", getPublicAuctions);
publicRouter.get("/:id", getPublicAuctionById);
publicRouter.get("/:id/bids", getPublicAuctionBids);
publicRouter.post("/request-verification", verificationLimiter, requestVerification);
publicRouter.post("/verify-email", verifyEmail);
publicRouter.post("/:id/bid", verifyBidder, bidLimiter, placeBid);

// ==========================================
// ADMIN ROUTER: /api/admin/auctions
// ==========================================
const adminRouter = express.Router();

// Strict RBAC: Requires authenticated session with either "admin" or "editor" role
adminRouter.use(protect, authorize("admin", "editor"));

adminRouter.get("/", getAdminAuctions);
adminRouter.get("/:id", getAdminAuctionById);
adminRouter.post("/", upload.single("image"), createPainting);
adminRouter.put("/:id", upload.single("image"), updatePainting);
adminRouter.post("/:id/publish", publishAuction);
adminRouter.post("/:id/unpublish", unpublishAuction);
adminRouter.post("/:id/cancel", cancelAuction);
adminRouter.post("/:id/mark-sold", markAuctionSold);
adminRouter.delete("/:id", deletePainting);
adminRouter.get("/:id/bids", getAdminAuctionBids);

module.exports = {
  publicRouter,
  adminRouter
};
