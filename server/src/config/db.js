const mongoose = require("mongoose");

let gfsBucket;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize GridFS bucket
    gfsBucket = new mongoose.mongo.GridFSBucket(conn.connection.db, {
      bucketName: "tattoo_images"
    });
    console.log("GridFS Bucket initialized.");
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

const getGFSBucket = () => {
  if (!gfsBucket) {
    throw new Error("GridFS Bucket not initialized.");
  }
  return gfsBucket;
};

module.exports = { connectDB, getGFSBucket };
