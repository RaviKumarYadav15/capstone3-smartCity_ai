import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { asyncHandler, HttpError } from '../utils/HttpError.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/limits.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(100) });

router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this e-mail already exists');
  // role is never taken from the request: everyone registers as a citizen; admins promote via `npm run set-role`
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: user.toPublic() });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new HttpError(401, 'Invalid e-mail or password');
  setAuthCookie(res, signToken(user));
  res.json({ user: user.toPublic() });
}));

router.post('/logout', (_req, res) => { clearAuthCookie(res); res.status(204).end(); });

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

export default router;
