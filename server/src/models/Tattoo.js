const mongoose = require("mongoose");

const tattooSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: [String],
      required: true
    },
    // Legacy MongoDB GridFS pointer (for backward compatibility)
    imageFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    // Cloudinary secure image URL
    imageUrl: {
      type: String,
      default: null
    },
    // Cloudinary public asset ID
    imagePublicId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Tattoo", tattooSchema);
