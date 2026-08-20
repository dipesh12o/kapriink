const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      default: null
    },
    role: {
      type: String,
      default: "admin"
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    setupTokenHash: {
      type: String,
      default: null
    },
    setupTokenExpiry: {
      type: Date,
      default: null
    },
    resetTokenHash: {
      type: String,
      default: null
    },
    resetTokenExpiry: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Admin", adminSchema);
