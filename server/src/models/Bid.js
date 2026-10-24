const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    painting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Painting",
      required: true,
      index: true
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuctionParticipant",
      required: true,
      index: true
    },
    bidderName: {
      type: String,
      required: true,
      trim: true
    },
    bidderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ["valid", "outbid", "retracted", "cancelled"],
      default: "valid"
    },
    idempotencyKey: {
      type: String,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

bidSchema.index({ painting: 1, amount: -1 });
bidSchema.index({ painting: 1, createdAt: -1 });
bidSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Bid", bidSchema);
