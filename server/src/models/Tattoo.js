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
    imageFileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Tattoo", tattooSchema);
