require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

const provision = async () => {
  const email = process.argv[2];

  if (!email || !email.includes("@")) {
    console.error("Error: Please provide a valid email address.");
    console.error("Usage: node server/src/scripts/provisionAdmin.js <email>");
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("Error: MONGODB_URI env variable is not configured.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for provisioning.");

    // Generate secure setup token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    let admin = await Admin.findOne({ email });

    if (admin) {
      console.log(`Admin account with email '${email}' already exists. Updating setup token...`);
      admin.setupTokenHash = hashedToken;
      admin.setupTokenExpiry = expiry;
      admin.passwordHash = null; // Clear password if resetting account
      await admin.save();
    } else {
      console.log(`Creating new admin account for '${email}'...`);
      admin = new Admin({
        email,
        setupTokenHash: hashedToken,
        setupTokenExpiry: expiry,
        role: "admin"
      });
      await admin.save();
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const setupLink = `${clientUrl}/admin/setup?token=${token}`;

    console.log("\n==================================================");
    console.log("ADMIN ACCOUNT PROVISIONED SUCCESSFULLY");
    console.log("==================================================");
    console.log(`Email:      ${email}`);
    console.log(`Token Link: ${setupLink}`);
    console.log("==================================================\n");
    console.log("Provide this link to the client to create their password.");
    console.log("Note: This setup link is valid for 24 hours.");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Provisioning failed:", error.message);
    process.exit(1);
  }
};

provision();
