import rateLimit from 'express-rate-limit';

const json = (msg) => ({ error: msg });

export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: json('Too many attempts, try again later') });
export const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
// Use after requireAuth so every request has a user id.
export const perUser = (limit, windowMs = 3600 * 1000) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => String(req.user._id), message: json('Hourly limit reached for this action') });
