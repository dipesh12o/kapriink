const express = require("express");
const multer = require("multer");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAllTattoos,
  getTattooImage,
  uploadTattoo,
  updateTattooMetadata,
  replaceTattooImage,
  deleteTattoo
} = require("../controllers/tattooController");

const router = express.Router();

// Multer memory storage config (max 10MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Public endpoints
router.get("/", getAllTattoos);
router.get("/image/:fileId", getTattooImage);

// Protected admin endpoints
router.post("/", protect, authorize("admin", "editor"), upload.single("image"), uploadTattoo);
router.put("/:id", protect, authorize("admin", "editor"), updateTattooMetadata);
router.put("/:id/image", protect, authorize("admin", "editor"), upload.single("image"), replaceTattooImage);
router.delete("/:id", protect, authorize("admin", "editor"), deleteTattoo);

module.exports = router;
