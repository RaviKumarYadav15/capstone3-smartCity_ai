import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { asyncHandler, HttpError } from '../utils/HttpError.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/users - List users with moderation and strike information (Admin & Authority only)
router.get('/', requireRole('admin', 'authority'), asyncHandler(async (req, res) => {
  const { role, flagged } = req.query;
  const filter = {};

  if (typeof role === 'string' && ['citizen', 'authority', 'admin'].includes(role)) {
    filter.role = role;
  }

  if (flagged === 'true') {
    filter.$or = [
      { strikes: { $gt: 0 } },
      { isBlocked: true },
      { status: { $in: ['warned', 'suspended', 'banned'] } },
    ];
  }

  const users = await User.find(filter)
    .sort({ strikes: -1, isBlocked: -1, createdAt: -1 })
    .limit(200);

  res.json({
    users: users.map((u) => u.toPublic()),
  });
}));

// PATCH /api/users/:id/block - Manually block a user (Admin only)
router.patch('/:id/block', requireRole('admin'), asyncHandler(async (req, res) => {
  const { reason } = z.object({
    reason: z.string().trim().min(3).max(500),
  }).parse(req.body);

  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user.role === 'admin') throw new HttpError(400, 'Cannot block an administrator account');

  user.isBlocked = true;
  user.status = 'banned';
  user.blockReason = reason;
  await user.save();

  res.json({ user: user.toPublic(), message: 'User account has been blocked' });
}));

// PATCH /api/users/:id/unblock - Unblock a previously blocked/suspended user (Admin only)
router.patch('/:id/unblock', requireRole('admin'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');

  user.isBlocked = false;
  user.suspendedUntil = null;
  user.blockReason = '';
  // If they have less than 2 strikes, return to active or warned
  if (user.strikes === 0) user.status = 'active';
  else if (user.strikes === 1) user.status = 'warned';
  else user.status = 'warned'; // forgiven upon unblock

  await user.save();
  res.json({ user: user.toPublic(), message: 'User account unblocked and restored' });
}));

// PATCH /api/users/:id/reset-strikes - Reset strike count back to zero (Admin only)
router.patch('/:id/reset-strikes', requireRole('admin'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');

  user.strikes = 0;
  user.status = 'active';
  user.isBlocked = false;
  user.suspendedUntil = null;
  user.blockReason = '';
  await user.save();

  res.json({ user: user.toPublic(), message: 'Strikes reset to 0 and standing restored' });
}));

export default router;
