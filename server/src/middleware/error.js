import { ZodError } from 'zod';
import multer from 'multer';
import { env } from '../config/env.js';

export const notFound = (_req, res) => res.status(404).json({ error: 'Not found' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ') });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 3 MB or smaller' : err.message });
  }
  if (err.name === 'CastError' || err.name === 'ValidationError') return res.status(400).json({ error: 'Invalid input' });
  if (err.code === 11000) return res.status(409).json({ error: 'That value already exists' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && env.isProd ? 'Server error' : err.message });
}
