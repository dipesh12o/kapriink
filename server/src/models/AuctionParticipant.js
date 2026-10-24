const mongoose = require("mongoose");

const auctionParticipantSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationTokenHash: {
      type: String,
      default: null
    },
    verificationTokenExpiry: {
      type: Date,
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    lastVerificationRequestAt: {
      type: Date,
      default: null
    },
    tokenVersion: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

auctionParticipantSchema.index({ verificationTokenHash: 1 }, { sparse: true });

module.exports = mongoose.model("AuctionParticipant", auctionParticipantSchema);
