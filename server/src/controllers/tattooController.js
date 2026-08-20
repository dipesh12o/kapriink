const mongoose = require("mongoose");
const Tattoo = require("../models/Tattoo");
const { getGFSBucket } = require("../config/db");

const getAllTattoos = async (req, res) => {
  try {
    const tattoos = await Tattoo.find({}).sort({ createdAt: -1 });
    res.json(tattoos);
  } catch (error) {
    console.error("Fetch tattoos error:", error.message);
    res.status(500).json({ message: "Server error fetching gallery." });
  }
};

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

  try {
    const bucket = getGFSBucket();
    
    // Open upload stream to GridFS
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype
    });

    uploadStream.on("error", (err) => {
      console.error("GridFS upload stream error:", err.message);
      res.status(500).json({ message: "Failed to store image in database." });
    });

    uploadStream.on("finish", async () => {
      try {
        // Create Tattoo document
        const tattoo = new Tattoo({
          title,
          category,
          imageFileId: uploadStream.id
        });

        await tattoo.save();
        res.status(201).json(tattoo);
      } catch (err) {
        // Cleanup GridFS file if document fails to save
        await bucket.delete(uploadStream.id).catch(() => {});
        console.error("Save tattoo error:", err.message);
        res.status(500).json({ message: "Failed to save tattoo metadata." });
      }
    });

    // Write file buffer to GridFS stream
    uploadStream.write(req.file.buffer);
    uploadStream.end();
  } catch (error) {
    console.error("Upload tattoo error:", error.message);
    res.status(500).json({ message: "Server error during upload." });
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

  try {
    const tattoo = await Tattoo.findById(id);
    if (!tattoo) {
      return res.status(404).json({ message: "Tattoo not found." });
    }

    const bucket = getGFSBucket();
    const oldFileId = tattoo.imageFileId;

    // Upload new image to GridFS
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype
    });

    uploadStream.on("error", (err) => {
      console.error("Replace stream error:", err.message);
      res.status(500).json({ message: "Failed to store replacement image." });
    });

    uploadStream.on("finish", async () => {
      try {
        // Update document pointer
        tattoo.imageFileId = uploadStream.id;
        await tattoo.save();

        // Delete old image asynchronously
        if (oldFileId) {
          await bucket.delete(new mongoose.Types.ObjectId(oldFileId)).catch((e) => {
            console.warn(`Failed to cleanup old image ${oldFileId}:`, e.message);
          });
        }

        res.json(tattoo);
      } catch (err) {
        // Clean up new upload if save failed
        await bucket.delete(uploadStream.id).catch(() => {});
        console.error("Replace save error:", err.message);
        res.status(500).json({ message: "Failed to update image link." });
      }
    });

    uploadStream.write(req.file.buffer);
    uploadStream.end();
  } catch (error) {
    console.error("Replace image error:", error.message);
    res.status(500).json({ message: "Server error replacing image." });
  }
};

const deleteTattoo = async (req, res) => {
  const { id } = req.params;

  try {
    const tattoo = await Tattoo.findById(id);
    if (!tattoo) {
      return res.status(404).json({ message: "Tattoo not found." });
    }

    const bucket = getGFSBucket();

    // 1. Delete image file from GridFS
    if (tattoo.imageFileId) {
      await bucket.delete(new mongoose.Types.ObjectId(tattoo.imageFileId)).catch((err) => {
        console.warn(`GridFS deletion warning for ${tattoo.imageFileId}:`, err.message);
      });
    }

    // 2. Delete metadata row in MongoDB
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
