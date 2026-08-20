const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const Tattoo = require("../models/Tattoo");

const check = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    const count = await Tattoo.countDocuments({});
    console.log(`Total Tattoo documents in DB: ${count}`);

    const list = await Tattoo.find({});
    console.log("Tattoo Documents:");
    console.log(JSON.stringify(list, null, 2));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error checking DB:", err.message);
    process.exit(1);
  }
};

check();
