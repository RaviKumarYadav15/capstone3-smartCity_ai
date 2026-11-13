import tls from 'node:tls';
import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  try {
    tls.DEFAULT_MAX_VERSION = 'TLSv1.2';
  } catch {}
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected');
}
