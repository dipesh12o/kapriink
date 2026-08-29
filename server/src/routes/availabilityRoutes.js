const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAvailability,
  updateAvailability
} = require("../controllers/availabilityController");

const router = express.Router();

// Public read-only endpoint
router.get("/", getAvailability);

// Admin-protected update endpoint
router.put("/", protect, authorize("admin", "editor"), updateAvailability);

module.exports = router;
