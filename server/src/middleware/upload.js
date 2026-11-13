import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';
import { detectImageType } from '../utils/image.js';

if (env.cloudinaryUrl) {
  cloudinary.config({ cloudinary_url: env.cloudinaryUrl });
} else {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
}).single('image');

export async function saveImage(buffer) {
  const type = detectImageType(buffer);
  if (!type) throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'smartcity', resource_type: 'image' },
      (err, result) => {
        if (err) return reject(new HttpError(500, `Image upload failed: ${err.message}`));
        resolve({ name: result.secure_url, mime: type.mime, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export const removeImage = async (urlOrId) => {
  if (!urlOrId) return;
  try {
    const matches = urlOrId.match(/smartcity\/[^.]+/);
    const publicId = matches ? matches[0] : urlOrId;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('Failed to delete image from Cloudinary:', err.message);
  }
};
