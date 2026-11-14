import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';
import { detectImageType } from '../utils/image.js';

if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
} else if (env.cloudinaryUrl) {
  try {
    const parsed = new URL(env.cloudinaryUrl);
    cloudinary.config({
      cloud_name: parsed.hostname,
      api_key: parsed.username,
      api_secret: parsed.password,
      secure: true,
    });
  } catch {
    cloudinary.config(true);
  }
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
}).single('image');

export async function saveImage(buffer) {
  const type = detectImageType(buffer);
  if (!type) throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');

  const ext = type.mime === 'image/png' ? 'png' : type.mime === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${crypto.randomUUID()}.${ext}`;

  // 1. Try Cloudinary if configured with 4s timeout
  const isCloudinaryConfigured = Boolean(
    (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) || env.cloudinaryUrl
  );

  if (isCloudinaryConfigured) {
    try {
      const result = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Cloudinary upload timeout')), 4000);
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'smartcity', resource_type: 'image' },
          (err, res) => {
            clearTimeout(timer);
            if (err) return reject(err);
            resolve(res);
          }
        );
        stream.end(buffer);
      });

      if (result && result.secure_url) {
        return { name: result.secure_url, mime: type.mime, publicId: result.public_id };
      }
    } catch (err) {
      console.warn('Cloudinary upload not completed, falling back to local file storage:', err.message);
    }
  }

  // 2. Fallback to local server uploads directory
  try {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return { name: filename, mime: type.mime, local: true };
  } catch (fsErr) {
    console.warn('Local file write failed, using data URI fallback:', fsErr.message);
    // 3. Fallback to base64 Data URI directly in MongoDB
    const dataUri = `data:${type.mime};base64,${buffer.toString('base64')}`;
    return { name: dataUri, mime: type.mime };
  }
}

export const removeImage = async (urlOrId) => {
  if (!urlOrId) return;
  try {
    if (urlOrId.startsWith('http')) {
      const matches = urlOrId.match(/smartcity\/[^.]+/);
      const publicId = matches ? matches[0] : urlOrId;
      await cloudinary.uploader.destroy(publicId);
    } else if (!urlOrId.startsWith('data:')) {
      const filePath = path.resolve(process.cwd(), 'uploads', urlOrId);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
  } catch (err) {
    console.warn('Failed to delete image:', err.message);
  }
};
