const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  login,
  logout,
  getMe,
  verifySetupToken,
  setupPassword,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword
} = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);

router.get("/setup", verifySetupToken);
router.post("/setup", setupPassword);

router.post("/forgot-password", forgotPassword);
router.get("/reset-password", verifyResetToken);
router.post("/reset-password", resetPassword);

router.post("/change-password", protect, changePassword);

module.exports = router;
