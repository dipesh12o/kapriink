const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const fs = require("fs");
const mongoose = require("mongoose");
const Tattoo = require("../models/Tattoo");

const PORTFOLIO_SEED = [
  {
    filename: "tattoo_skull_arrow.jpg",
    title: "Black and gray skull tattoo with arrow design on lower leg",
    category: ["Dark Shading", "Fine Line"]
  },
  {
    filename: "tattoo_cowboy_hat.jpg",
    title: "Small fine-line cowboy hat tattoo with cow-print pattern on ankle",
    category: ["Fine Line"]
  },
  {
    filename: "tattoo_script_back.jpg",
    title: "Script tattoo along the spine: 'Perfectly Imperfect : Psalms 139' ending with heart outline",
    category: ["Fine Line"]
  },
  {
    filename: "tattoo_red_floral.jpg",
    title: "Red floral outline tattoo with multiple flower heads on arm",
    category: ["Color", "Fine Line"]
  },
  {
    filename: "tattoo_botanical_sternum.jpg",
    title: "Fine-line botanical branches tattoo extending horizontally below the chest",
    category: ["Fine Line"]
  },
  {
    filename: "tattoo_spider_amor.jpg",
    title: "Black ink symmetrical spider tattoo forming a heart around the belly button with 'amor' script text above",
    category: ["Dark Shading", "Fine Line"]
  },
  {
    filename: "tattoo_eye_heart.jpg",
    title: "Illustrative eye tattoo inside a flaming black heart outline on arm",
    category: ["Dark Shading"]
  },
  {
    filename: "tattoo_mushroom.jpg",
    title: "Mushroom/jellyfish-like illustrative tattoo with bubbles on calf",
    category: ["Dark Shading", "Fine Line"]
  },
  {
    filename: "tattoo_abstract_skull_8ball.jpg",
    title: "Abstract melting skull design, dripping 8-ball, and graffiti-like crown on forearm",
    category: ["Abstract", "Dark Shading"]
  }
];

const seed = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for seeding.");

    const count = await Tattoo.countDocuments({});
    if (count > 0) {
      console.log(`Database already has ${count} tattoos. Skipping seed.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log("Database is empty. Seeding initial gallery content...");

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "tattoo_images"
    });

    const tattoosDir = path.join(__dirname, "../../../public/assets/kapriink/tattoos");

    for (const item of PORTFOLIO_SEED) {
      const filePath = path.join(tattoosDir, item.filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}. Skipping.`);
        continue;
      }

      console.log(`Uploading ${item.filename} to GridFS...`);
      const fileBuffer = fs.readFileSync(filePath);

      const uploadStream = bucket.openUploadStream(item.filename, {
        contentType: "image/jpeg"
      });

      await new Promise((resolve, reject) => {
        uploadStream.on("error", reject);
        uploadStream.on("finish", async () => {
          try {
            const tattoo = new Tattoo({
              title: item.title,
              category: item.category,
              imageFileId: uploadStream.id
            });
            await tattoo.save();
            console.log(`Seeded tattoo: ${item.title}`);
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        uploadStream.write(fileBuffer);
        uploadStream.end();
      });
    }

    console.log("Seeding completed successfully.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seed();
