import { ZodError } from 'zod';
import multer from 'multer';
import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

export const notFound = (_req, res) => res.status(404).json({ error: 'Not found' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ') });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 3 MB or smaller' : err.message });
  }
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors || {}).map((e) => e.message).join('; ');
    return res.status(400).json({ error: msg || 'Invalid input' });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid identifier or data type' });
  if (err.code === 11000) return res.status(409).json({ error: 'That value already exists' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const errorMessage = (err instanceof HttpError)
    ? err.message
    : (status >= 500 && env.isProd ? 'Server error' : err.message);
  res.status(status).json({ error: errorMessage || 'An unexpected error occurred' });
}
