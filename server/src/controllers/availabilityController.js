const Availability = require("../models/Availability");

// Default initial schedule
const DEFAULT_AVAILABILITY = {
  days: {
    monday: { isOpen: true, openTime: "15:00", closeTime: "20:00" },
    tuesday: { isOpen: true, openTime: "15:00", closeTime: "20:00" },
    wednesday: { isOpen: true, openTime: "15:00", closeTime: "20:00" },
    thursday: { isOpen: true, openTime: "15:00", closeTime: "20:00" },
    friday: { isOpen: true, openTime: "15:00", closeTime: "20:00" },
    saturday: { isOpen: true, openTime: "10:00", closeTime: "19:00" },
    sunday: { isOpen: true, openTime: "10:00", closeTime: "19:00" }
  },
  note: "Appointments outside core hours are subject to special request."
};

const getAvailability = async (req, res) => {
  try {
    let availability = await Availability.findOne({});
    
    // Seed defaults if no availability configuration exists
    if (!availability) {
      availability = new Availability(DEFAULT_AVAILABILITY);
      await availability.save();
    }
    
    res.json(availability);
  } catch (error) {
    console.error("Get availability error:", error.message);
    res.status(500).json({ message: "Server error while fetching studio availability." });
  }
};

const updateAvailability = async (req, res) => {
  const { days, note } = req.body;

  if (!days) {
    return res.status(400).json({ message: "Availability days configuration is required." });
  }

  // Validate the days structure and times
  const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  for (const day of dayNames) {
    const schedule = days[day];
    if (!schedule) {
      return res.status(400).json({ message: `Availability details for ${day} are missing.` });
    }

    if (schedule.isOpen) {
      if (!schedule.openTime || !schedule.closeTime) {
        return res.status(400).json({ message: `Opening and closing times are required for ${day}.` });
      }

      // Ensure closeTime is after openTime
      const [openHour, openMin] = schedule.openTime.split(":").map(Number);
      const [closeHour, closeMin] = schedule.closeTime.split(":").map(Number);

      const openVal = openHour * 60 + openMin;
      const closeVal = closeHour * 60 + closeMin;

      if (closeVal <= openVal) {
        return res.status(400).json({ message: `Closing time must be later than opening time for ${day}.` });
      }
    }
  }

  try {
    let availability = await Availability.findOne({});
    if (!availability) {
      availability = new Availability({ days, note });
    } else {
      availability.days = days;
      availability.note = note !== undefined ? note : availability.note;
    }

    await availability.save();
    res.json({ message: "Studio availability updated successfully.", availability });
  } catch (error) {
    console.error("Update availability error:", error.message);
    res.status(500).json({ message: "Server error while updating studio availability." });
  }
};

module.exports = {
  getAvailability,
  updateAvailability
};
