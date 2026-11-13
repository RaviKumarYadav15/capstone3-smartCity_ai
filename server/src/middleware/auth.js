import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/HttpError.js';

const WEEK = 7 * 24 * 3600 * 1000;

export const signToken = (user) => jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: '7d' });

export const setAuthCookie = (res, token) =>
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: env.isProd ? 'none' : 'lax',
    secure: env.isProd ? true : env.cookieSecure,
    maxAge: WEEK,
    path: '/',
  });

export const clearAuthCookie = (res) =>
  res.clearCookie('token', {
    path: '/',
    sameSite: env.isProd ? 'none' : 'lax',
    secure: env.isProd ? true : env.cookieSecure,
  });

/** Attaches req.user (fresh from DB, so role changes/deletions apply immediately) or null. */
export async function loadUser(req, _res, next) {
  req.user = null;
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    const { sub } = jwt.verify(token, env.jwtSecret);
    req.user = await User.findById(sub);
  } catch { /* invalid or expired token -> anonymous */ }
  next();
}

export const requireAuth = (req, _res, next) => (req.user ? next() : next(new HttpError(401, 'Please sign in')));

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Please sign in'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to do this'));
  next();
};

/** Cookie auth + state-changing request: reject cross-site Origins (defence in depth on top of SameSite). */
export function sameOrigin(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const cleanOrigin = origin.replace(/\/$/, '');
  const cleanClient = (env.clientOrigin || '').replace(/\/$/, '');
  const hostOrigin = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
  const allowed = new Set([cleanClient, hostOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173']);
  return allowed.has(cleanOrigin) ? next() : next(new HttpError(403, 'Cross-origin request blocked'));
}
