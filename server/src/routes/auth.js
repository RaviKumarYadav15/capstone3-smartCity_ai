import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { asyncHandler, HttpError } from '../utils/HttpError.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/limits.js';

const router = Router();

// Constant cost-12 bcrypt hash for dummy comparisons to avoid username enumeration via response timing
const DUMMY_HASH = '$2b$12$K1J8qYh5uT8M3o5N7V2Q2.N0yM2lP9kR8sU1vW3xY5zA7bC9dE1fG';

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
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ user: user.toPublic(), token });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');
  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
  const ok = await bcrypt.compare(password, hashToCompare);
  if (!user || !ok) throw new HttpError(401, 'Invalid e-mail or password');
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: user.toPublic(), token });
}));

router.post('/logout', (_req, res) => { clearAuthCookie(res); res.status(204).end(); });

router.post('/logout-all', requireAuth, asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  clearAuthCookie(res);
  res.status(204).end();
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

export default router;
