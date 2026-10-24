const mongoose = require("mongoose");

const paintingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000
    },
    imageUrl: {
      type: String,
      required: true
    },
    imagePublicId: {
      type: String,
      required: true
    },
    dimensions: {
      type: String,
      trim: true,
      default: ""
    },
    medium: {
      type: String,
      trim: true,
      default: ""
    },
    startingBid: {
      type: Number,
      required: true,
      min: 1
    },
    minBidIncrement: {
      type: Number,
      default: 10,
      min: 1
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "sold"],
      default: "draft"
    },
    currentHighestBid: {
      type: Number,
      default: 0
    },
    bidCount: {
      type: Number,
      default: 0
    },
    winner: {
      bidId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bid",
        default: null
      },
      bidderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AuctionParticipant",
        default: null
      },
      amount: {
        type: Number,
        default: null
      },
      name: {
        type: String,
        default: null
      },
      email: {
        type: String,
        default: null
      },
      placedAt: {
        type: Date,
        default: null
      }
    },
    isSaleConfirmed: {
      type: Boolean,
      default: false
    },
    soldAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

paintingSchema.index({ status: 1, startTime: 1, endTime: 1 });
paintingSchema.index({ createdAt: -1 });

// Helper to determine computed auction status
paintingSchema.methods.getComputedStatus = function (now = new Date()) {
  if (this.status === "draft") return "draft";
  if (this.status === "cancelled") return "cancelled";
  if (this.status === "sold") return "sold";
  if (this.status === "published") {
    const start = new Date(this.startTime);
    const end = new Date(this.endTime);
    if (now < start) return "upcoming";
    if (now >= start && now < end) return "live";
    return "ended";
  }
  return this.status;
};

const Painting = mongoose.model("Painting", paintingSchema);

const getComputedStatus = (painting, now = new Date()) => {
  if (painting.status === "draft") return "draft";
  if (painting.status === "cancelled") return "cancelled";
  if (painting.status === "sold") return "sold";
  if (painting.status === "published") {
    const start = new Date(painting.startTime);
    const end = new Date(painting.endTime);
    if (now < start) return "upcoming";
    if (now >= start && now < end) return "live";
    return "ended";
  }
  return painting.status;
};

module.exports = Painting;
module.exports.getComputedStatus = getComputedStatus;
