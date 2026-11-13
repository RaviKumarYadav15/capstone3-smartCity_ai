import { Router } from 'express';
import { z } from 'zod';
import { Dispute, serializeDispute } from '../models/Dispute.js';
import { asyncHandler, HttpError } from '../utils/HttpError.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// admin moderation queue
router.get('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const docs = await Dispute.find().sort({ createdAt: -1 }).limit(200);
  res.json({ disputes: docs.map((d) => serializeDispute(d, req.user._id)) });
}));

router.get('/:id/letter', requireAuth, asyncHandler(async (req, res) => {
  const d = await Dispute.findById(req.params.id);
  if (!d) throw new HttpError(404, 'Dispute not found');
  res.json({ letter: d.letter });
}));

// one support per user; the author is already counted as a supporter
router.post('/:id/support', requireAuth, asyncHandler(async (req, res) => {
  const d = await Dispute.findByIdAndUpdate(req.params.id, { $addToSet: { supporters: req.user._id } }, { new: true });
  if (!d) throw new HttpError(404, 'Dispute not found');
  res.json({ dispute: serializeDispute(d, req.user._id) });
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['open', 'reviewed', 'dismissed']) }).parse(req.body);
  const d = await Dispute.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!d) throw new HttpError(404, 'Dispute not found');
  res.json({ dispute: serializeDispute(d, req.user._id) });
}));

export default router;
