const mongoose = require("mongoose");

const dayScheduleSchema = new mongoose.Schema(
  {
    isOpen: {
      type: Boolean,
      default: true
    },
    openTime: {
      type: String, // "HH:MM" e.g., "15:00"
      required: true
    },
    closeTime: {
      type: String, // "HH:MM" e.g., "20:00"
      required: true
    }
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    days: {
      monday: { type: dayScheduleSchema, required: true },
      tuesday: { type: dayScheduleSchema, required: true },
      wednesday: { type: dayScheduleSchema, required: true },
      thursday: { type: dayScheduleSchema, required: true },
      friday: { type: dayScheduleSchema, required: true },
      saturday: { type: dayScheduleSchema, required: true },
      sunday: { type: dayScheduleSchema, required: true }
    },
    note: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Availability", availabilitySchema);
