import { Router } from 'express';
import { z } from 'zod';
import { Tender, serializeTender } from '../models/Tender.js';
import { Dispute, serializeDispute, DISPUTE_CATEGORIES } from '../models/Dispute.js';
import { asyncHandler, HttpError, escapeRegex } from '../utils/HttpError.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { imageUpload, saveImage } from '../middleware/upload.js';
import { perUser } from '../middleware/limits.js';
import { aiEnabled, breakdownTender, writeDisputeLetter } from '../services/gemini.js';
import { disputeTemplate } from '../services/letters.js';

const router = Router();

const tenderSchema = z.object({
  tenderId: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,40}$/, 'Tender ID: 3-40 letters, digits or dashes'),
  title: z.string().trim().min(5).max(200),
  budget: z.coerce.number().positive().max(1e12),
  department: z.string().trim().min(2).max(100),
  contractor: z.string().trim().min(2).max(120),
  location: z.string().trim().max(160).optional(),
  deadline: z.coerce.date().optional(),
  warranty: z.string().trim().max(160).optional(),
  specs: z.string().trim().max(2000).optional(),
  status: z.enum(['sanctioned', 'in_progress', 'completed']).default('sanctioned'),
});

const disputeCounts = async (ids) => {
  const rows = await Dispute.aggregate([{ $match: { tenderId: { $in: ids }, status: { $ne: 'dismissed' } } }, { $group: { _id: '$tenderId', n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
};

router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  if (typeof req.query.status === 'string' && ['sanctioned', 'in_progress', 'completed'].includes(req.query.status)) filter.status = req.query.status;
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim().slice(0, 60)), 'i');
    filter.$or = [{ title: rx }, { tenderId: rx }, { contractor: rx }, { department: rx }, { location: rx }];
  }
  const docs = await Tender.find(filter).select('-aiBreakdown').sort({ createdAt: -1 }).limit(100);
  const counts = await disputeCounts(docs.map((d) => d.tenderId));
  let tenders = docs.map((d) => serializeTender(d, counts[d.tenderId] ?? 0));
  if (req.query.disputed === 'true') tenders = tenders.filter((t) => t.disputeCount > 0);
  res.json({ tenders });
}));

router.get('/:tenderId', asyncHandler(async (req, res) => {
  const t = await Tender.findOne({ tenderId: req.params.tenderId.toUpperCase() });
  if (!t) throw new HttpError(404, 'Tender not found');
  const counts = await disputeCounts([t.tenderId]);
  const disputes = await Dispute.find({ tenderId: t.tenderId, status: { $ne: 'dismissed' } }).select('-letter').sort({ createdAt: -1 }).limit(50);
  res.json({ tender: serializeTender(t, counts[t.tenderId] ?? 0), disputes: disputes.map((d) => serializeDispute(d, req.user?._id)) });
}));

// Only verified authority accounts publish tenders (role granted by an admin, never self-assigned).
router.post('/', requireRole('authority', 'admin'), perUser(20), asyncHandler(async (req, res) => {
  const body = tenderSchema.parse(req.body);
  if (await Tender.exists({ tenderId: body.tenderId })) throw new HttpError(409, 'A tender with this ID already exists');
  let aiBreakdown = null;
  if (aiEnabled()) { try { aiBreakdown = await breakdownTender(body); } catch (e) { console.warn('Tender breakdown skipped:', e.message); } }
  const tender = await Tender.create({ ...body, aiBreakdown, createdBy: req.user._id });
  res.status(201).json({ tender: serializeTender(tender, 0) });
}));

router.post('/:tenderId/breakdown', requireAuth, perUser(15), asyncHandler(async (req, res) => {
  const tender = await Tender.findOne({ tenderId: req.params.tenderId.toUpperCase() });
  if (!tender) throw new HttpError(404, 'Tender not found');

  const canRegenerate = ['authority', 'admin'].includes(req.user.role);
  if (!tender.aiBreakdown?.feasibility || canRegenerate) {
    if (aiEnabled()) {
      try {
        tender.aiBreakdown = await breakdownTender(tender);
      } catch (err) {
        tender.aiBreakdown = {
          estimate: true,
          table: tender.aiBreakdown?.table || [],
          warrantyNotes: tender.warranty || 'Defect liability terms as per agreement.',
          checklist: ['Request Schedule of Rates comparison from the department.'],
          feasibility: {
            verdict: 'human_audit_needed',
            summary: 'AI analysis could not verify expenses automatically. On-site human verification by municipal engineers recommended.',
            keyObservations: ['Tender scope requires field verification with measurement records.'],
            citizenQuestions: ['Request site inspection report and quality assurance test results.'],
          },
          generatedAt: new Date(),
        };
      }
    } else {
      tender.aiBreakdown = {
        estimate: true,
        table: tender.aiBreakdown?.table || [],
        warrantyNotes: tender.warranty || 'Defect liability terms as per agreement.',
        checklist: ['Request Schedule of Rates comparison from the department.'],
        feasibility: {
          verdict: 'human_audit_needed',
          summary: 'AI analysis service is offline. On-site verification recommended.',
          keyObservations: ['Manual audit required by municipal authority.'],
          citizenQuestions: ['Request the complete Bill of Quantities (BOQ).'],
        },
        generatedAt: new Date(),
      };
    }
    await tender.save();
  }

  const counts = await disputeCounts([tender.tenderId]);
  res.json({ tender: serializeTender(tender, counts[tender.tenderId] ?? 0) });
}));

router.delete('/:tenderId', requireRole('admin'), asyncHandler(async (req, res) => {
  const t = await Tender.findOneAndDelete({ tenderId: req.params.tenderId.toUpperCase() });
  if (!t) throw new HttpError(404, 'Tender not found');
  res.status(204).end();
}));

// ---- disputes for a tender ----
const disputeSchema = z.object({
  category: z.enum(DISPUTE_CATEGORIES),
  description: z.string().trim().min(20, 'Please describe what you observed (20+ characters)').max(2000),
});

router.post('/:tenderId/disputes', requireAuth, perUser(10), imageUpload, asyncHandler(async (req, res) => {
  const body = disputeSchema.parse(req.body);
  const tender = await Tender.findOne({ tenderId: req.params.tenderId.toUpperCase() });
  if (!tender) throw new HttpError(404, 'Tender not found');
  const saved = req.file ? await saveImage(req.file.buffer) : null;

  const ctx = { tender, category: body.category, description: body.description, userName: req.user.name };
  let letter;
  try { letter = aiEnabled() ? await writeDisputeLetter(ctx) : disputeTemplate(ctx); } catch { letter = disputeTemplate(ctx); }

  const dispute = await Dispute.create({
    tenderId: tender.tenderId, ...body, image: saved?.name, user: req.user._id, userName: req.user.name, supporters: [req.user._id], letter,
  });
  res.status(201).json({ dispute: serializeDispute(dispute, req.user._id) });
}));

export default router;
