const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: "kapriink/tattoos"
    };

    // Include upload_preset if configured
    if (process.env.CLOUDINARY_UPLOAD_PRESET) {
      defaultOptions.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET;
    }

    const uploadOptions = { ...defaultOptions, ...options };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error(`Failed to delete Cloudinary asset '${publicId}':`, error.message);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary
};
