const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const { connectDB, getGFSBucket } = require("../config/db");
const { uploadToCloudinary } = require("../config/cloudinary");
const Tattoo = require("../models/Tattoo");

// Helper to convert GridFS download stream into a Buffer
const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
};

const runMigration = async () => {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("==================================================");
  console.log(`KAPRINK GRIDFS TO CLOUDINARY DATA MIGRATION`);
  console.log(`MODE: ${isDryRun ? "DRY RUN (NO CHANGES WILL BE MADE)" : "LIVE MIGRATION"}`);
  console.log("==================================================\n");

  try {
    if (!isDryRun) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error("ERROR: Missing Cloudinary environment variables!");
        console.error("Please add the following variables to server/.env before running live migration:\n");
        console.error("  CLOUDINARY_CLOUD_NAME=your_cloud_name");
        console.error("  CLOUDINARY_API_KEY=your_api_key");
        console.error("  CLOUDINARY_API_SECRET=your_api_secret\n");
        process.exit(1);
      }
    }

    await connectDB();
    const bucket = getGFSBucket();

    // Query all Tattoo documents where imageFileId exists AND imageUrl/imagePublicId is missing
    const legacyTattoos = await Tattoo.find({
      imageFileId: { $ne: null },
      $or: [
        { imageUrl: { $eq: null } },
        { imageUrl: { $exists: false } },
        { imagePublicId: { $eq: null } },
        { imagePublicId: { $exists: false } }
      ]
    }).sort({ createdAt: 1 });

    console.log(`Found ${legacyTattoos.length} legacy GridFS tattoo record(s) pending migration.\n`);

    if (legacyTattoos.length === 0) {
      console.log("No legacy GridFS tattoo records found that require migration.");
      console.log("All tattoo records are already using Cloudinary!");
      await mongoose.disconnect();
      process.exit(0);
    }

    if (isDryRun) {
      console.log("--- DRY RUN REPORT ---");
      legacyTattoos.forEach((tattoo, index) => {
        console.log(`[${index + 1}/${legacyTattoos.length}] Record ID: ${tattoo._id}`);
        console.log(`    Title:       ${tattoo.title}`);
        console.log(`    Category:    ${tattoo.category.join(", ")}`);
        console.log(`    GridFS ID:   ${tattoo.imageFileId}`);
        console.log(`    Status:      PENDING MIGRATION (Dry-Run: No changes made)\n`);
      });

      console.log("==================================================");
      console.log("DRY RUN COMPLETED SUCCESSFULLY");
      console.log("==================================================");
      console.log(`Total legacy records detected: ${legacyTattoos.length}`);
      console.log("Cloudinary uploads performed: 0");
      console.log("MongoDB updates performed:    0");
      console.log("GridFS deletions performed:  0");
      console.log("\nTo execute the actual migration, run:");
      console.log("  npm run migrate:gridfs");
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // LIVE MIGRATION LOGIC
    let successCount = 0;
    let failCount = 0;
    let gridfsDeletedCount = 0;
    let gridfsPreservedCount = 0;

    for (let i = 0; i < legacyTattoos.length; i++) {
      const tattoo = legacyTattoos[i];
      const progressLabel = `[${i + 1}/${legacyTattoos.length}] Migrating tattoo: '${tattoo.title}' (ID: ${tattoo._id})`;

      console.log(progressLabel);

      let buffer;
      let cloudResult;

      try {
        // 1. Verify GridFS file exists
        const fileId = new mongoose.Types.ObjectId(tattoo.imageFileId);
        const files = await bucket.find({ _id: fileId }).toArray();

        if (files.length === 0) {
          throw new Error(`GridFS file ID '${tattoo.imageFileId}' not found in 'tattoo_images' bucket.`);
        }

        // 2. Read file from GridFS stream
        const downloadStream = bucket.openDownloadStream(fileId);
        buffer = await streamToBuffer(downloadStream);

        // 3. Upload to Cloudinary under folder 'kapriink/tattoos'
        cloudResult = await uploadToCloudinary(buffer, {
          folder: "kapriink/tattoos"
        });

        if (!cloudResult || !cloudResult.secure_url || !cloudResult.public_id) {
          throw new Error("Cloudinary upload did not return a valid secure_url or public_id.");
        }

        console.log(`  └─ Cloudinary upload: SUCCESS (${cloudResult.secure_url})`);

        // 4. Update MongoDB document
        tattoo.imageUrl = cloudResult.secure_url;
        tattoo.imagePublicId = cloudResult.public_id;
        tattoo.imageFileId = null; // Unlink GridFS pointer after Cloudinary details are attached

        await tattoo.save();
        console.log(`  └─ MongoDB update:    SUCCESS`);

        // 5. Delete old GridFS file ONLY after successful Cloudinary upload & MongoDB save
        await bucket.delete(fileId);
        console.log(`  └─ GridFS deletion:   SUCCESS\n`);

        successCount++;
        gridfsDeletedCount++;
      } catch (err) {
        failCount++;
        gridfsPreservedCount++;

        console.error(`  [X] FAILED: '${tattoo.title}'`);
        console.error(`      Reason: ${err.message}`);
        console.error(`      GridFS preserved: YES\n`);
      }
    }

    console.log("==================================================");
    console.log("MIGRATION SUMMARY");
    console.log("==================================================");
    console.log(`Total legacy images:    ${legacyTattoos.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed:                 ${failCount}`);
    console.log(`GridFS files deleted:   ${gridfsDeletedCount}`);
    console.log(`GridFS files preserved: ${gridfsPreservedCount}`);
    console.log("==================================================\n");

    await mongoose.disconnect();
    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error("Migration fatal error:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

runMigration();
