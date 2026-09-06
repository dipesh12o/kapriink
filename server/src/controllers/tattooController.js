const mongoose = require("mongoose");
const Tattoo = require("../models/Tattoo");
const { getGFSBucket } = require("../config/db");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");

const getAllTattoos = async (req, res) => {
  try {
    const tattoos = await Tattoo.find({}).sort({ createdAt: -1 });
    res.json(tattoos);
  } catch (error) {
    console.error("Fetch tattoos error:", error.message);
    res.status(500).json({ message: "Server error fetching gallery." });
  }
};

// Legacy endpoint for serving GridFS stored images
const getTattooImage = async (req, res) => {
  const { fileId } = req.params;

  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
    return res.status(400).json({ message: "Invalid image file ID." });
  }

  try {
    const bucket = getGFSBucket();
    const objectId = new mongoose.Types.ObjectId(fileId);

    // Verify file exists
    const files = await bucket.find({ _id: objectId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ message: "Image not found." });
    }

    // Set headers
    res.set("Content-Type", files[0].contentType || "image/jpeg");
    res.set("Cache-Control", "public, max-age=31536000"); // 1 year cache

    // Pipe download stream to response
    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream.on("error", (err) => {
      console.error("Stream download error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error streaming image." });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Get image error:", error.message);
    res.status(500).json({ message: "Server error streaming image." });
  }
};

const uploadTattoo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please upload an image file." });
  }

  // Validate image file type
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: "Only JPEG, PNG, WEBP, and GIF images are allowed." });
  }

  const { title } = req.body;
  let { category } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title is required." });
  }

  // Parse categories robustly
  if (typeof category === "string") {
    try {
      category = JSON.parse(category);
    } catch (e) {
      category = category.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  if (!category || !Array.isArray(category) || category.length === 0) {
    return res.status(400).json({ message: "At least one category is required." });
  }

  let cloudResult;
  try {
    // 1. Upload file buffer to Cloudinary
    cloudResult = await uploadToCloudinary(req.file.buffer);

    // 2. Save tattoo metadata record to MongoDB
    const tattoo = new Tattoo({
      title,
      category,
      imageUrl: cloudResult.secure_url,
      imagePublicId: cloudResult.public_id
    });

    await tattoo.save();
    res.status(201).json(tattoo);
  } catch (error) {
    console.error("Upload tattoo error:", error.message);
    // Cleanup newly uploaded Cloudinary image if DB save failed
    if (cloudResult && cloudResult.public_id) {
      await deleteFromCloudinary(cloudResult.public_id).catch(() => {});
    }
    res.status(500).json({ message: "Failed to upload tattoo image to Cloudinary." });
  }
};

const updateTattooMetadata = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  let { category } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title is required." });
  }

  if (typeof category === "string") {
    try {
      category = JSON.parse(category);
    } catch (e) {
      category = category.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  try {
    const tattoo = await Tattoo.findById(id);
    if (!tattoo) {
      return res.status(404).json({ message: "Tattoo not found." });
    }

    tattoo.title = title;
    if (category && Array.isArray(category) && category.length > 0) {
      tattoo.category = category;
    }

    await tattoo.save();
    res.json(tattoo);
  } catch (error) {
    console.error("Update metadata error:", error.message);
    res.status(500).json({ message: "Server error updating metadata." });
  }
};

const replaceTattooImage = async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: "Please upload an image file." });
  }

  // Validate image file type
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: "Only JPEG, PNG, WEBP, and GIF images are allowed." });
  }

  let tattoo;
  try {
    tattoo = await Tattoo.findById(id);
    if (!tattoo) {
      return res.status(404).json({ message: "Tattoo not found." });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error looking up tattoo record." });
  }

  const oldPublicId = tattoo.imagePublicId;
  const oldFileId = tattoo.imageFileId;

  let cloudResult;
  try {
    // 1. Upload new image to Cloudinary FIRST
    cloudResult = await uploadToCloudinary(req.file.buffer);

    // 2. Update document pointers
    tattoo.imageUrl = cloudResult.secure_url;
    tattoo.imagePublicId = cloudResult.public_id;
    tattoo.imageFileId = null; // Disconnect old GridFS pointer if replacing legacy image

    await tattoo.save();

    // 3. Clean up previous asset asynchronously after DB save success
    if (oldPublicId) {
      deleteFromCloudinary(oldPublicId).catch((e) => {
        console.warn(`Failed to cleanup old Cloudinary image '${oldPublicId}':`, e.message);
      });
    } else if (oldFileId) {
      const bucket = getGFSBucket();
      bucket.delete(new mongoose.Types.ObjectId(oldFileId)).catch((e) => {
        console.warn(`Failed to cleanup legacy GridFS image '${oldFileId}':`, e.message);
      });
    }

    res.json(tattoo);
  } catch (error) {
    console.error("Replace image error:", error.message);
    // Cleanup new Cloudinary asset if DB update failed
    if (cloudResult && cloudResult.public_id) {
      await deleteFromCloudinary(cloudResult.public_id).catch(() => {});
    }
    res.status(500).json({ message: "Failed to replace tattoo image." });
  }
};

const deleteTattoo = async (req, res) => {
  const { id } = req.params;

  try {
    const tattoo = await Tattoo.findById(id);
    if (!tattoo) {
      return res.status(404).json({ message: "Tattoo not found." });
    }

    // 1. Delete image asset from Cloudinary (if present)
    if (tattoo.imagePublicId) {
      await deleteFromCloudinary(tattoo.imagePublicId).catch((err) => {
        console.warn(`Cloudinary asset deletion warning for '${tattoo.imagePublicId}':`, err.message);
      });
    }

    // 2. Delete legacy GridFS file (if present)
    if (tattoo.imageFileId) {
      const bucket = getGFSBucket();
      await bucket.delete(new mongoose.Types.ObjectId(tattoo.imageFileId)).catch((err) => {
        console.warn(`GridFS file deletion warning for '${tattoo.imageFileId}':`, err.message);
      });
    }

    // 3. Delete metadata document in MongoDB
    await Tattoo.findByIdAndDelete(id);

    res.json({ message: "Tattoo deleted successfully." });
  } catch (error) {
    console.error("Delete tattoo error:", error.message);
    res.status(500).json({ message: "Server error deleting tattoo." });
  }
};

module.exports = {
  getAllTattoos,
  getTattooImage,
  uploadTattoo,
  updateTattooMetadata,
  replaceTattooImage,
  deleteTattoo
};
