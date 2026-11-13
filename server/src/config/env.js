import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';
const need = (key, devDefault) => {
  const v = process.env[key] ?? (isProd ? undefined : devDefault);
  if (!v) throw new Error(`Missing required environment variable ${key}`);
  return v;
};

export const env = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: need('MONGODB_URI', 'mongodb://127.0.0.1:27017/smartcity'),
  jwtSecret: need('JWT_SECRET', 'dev-only-secret-change-me-dev-only-secret'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cookieSecure: (process.env.COOKIE_SECURE ?? String(isProd)) === 'true',
  trustProxy: process.env.TRUST_PROXY === 'true',
};

if (isProd && env.jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production');
