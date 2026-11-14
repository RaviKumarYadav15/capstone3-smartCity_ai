import { Router } from 'express';
import { z } from 'zod';
import { Report, serializeReport, STATUSES } from '../models/Report.js';
import { asyncHandler, HttpError } from '../utils/HttpError.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { imageUpload, saveImage, removeImage } from '../middleware/upload.js';
import { perUser } from '../middleware/limits.js';
import { aiEnabled, analyzeIssueImage, writeComplaintLetter } from '../services/gemini.js';
import { complaintTemplate } from '../services/letters.js';
import { sanitizeIssueReport, CATEGORIES, DEPARTMENTS } from '../utils/sanitize.js';
import { detectImageType } from '../utils/image.js';

const router = Router();

const addressSchema = z.object({
  area: z.string().max(200).optional().default(''),
  city: z.string().max(200).optional().default(''),
  state: z.string().max(200).optional().default(''),
  country: z.string().max(200).optional().default(''),
  pincode: z.string().max(50).optional().default(''),
  formatted: z.string().max(500).optional().default(''),
}).optional();

const createSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  category: z.string().optional(),
  description: z.string().trim().max(1000).optional().default(''),
  address: z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return undefined; }
    }
    return val;
  }, addressSchema),
  area: z.string().max(200).optional(),
  city: z.string().max(200).optional(),
  state: z.string().max(200).optional(),
  country: z.string().max(200).optional(),
  pincode: z.string().max(50).optional(),
  formattedAddress: z.string().max(500).optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  const { status, severity } = req.query;
  if (typeof status === 'string' && STATUSES.includes(status)) filter.status = status;
  if (typeof severity === 'string') filter.severity = severity;
  const limit = Math.min(Number(req.query.limit) || 200, 200);
  const docs = await Report.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json({ reports: docs.map((d) => serializeReport(d, req.user?._id, req.user?.role)) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new HttpError(404, 'Report not found');
  res.json({ report: serializeReport(report, req.user?._id, req.user?.role) });
}));

// Instant AI image description and category detector
router.post('/describe', requireAuth, perUser(20), imageUpload, asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please select or upload a photo first');
  const type = detectImageType(req.file.buffer);
  if (!type) throw new HttpError(400, 'Only JPEG, PNG or WebP images are supported');
  if (!aiEnabled()) throw new HttpError(503, 'AI features are not configured');

  const analysis = await analyzeIssueImage({ buffer: req.file.buffer, mime: type.mime });
  if (analysis.isValid === false) {
    return res.json({
      isValid: false,
      rejectionReason: analysis.rejectionReason || 'The uploaded photo does not appear to show a valid civic infrastructure issue.',
    });
  }

  res.json({
    isValid: true,
    category: analysis.category || 'other',
    description: analysis.description || '',
    severity: analysis.severity || 'medium',
    department: analysis.department || '',
    priority: analysis.priority || 5,
  });
}));

router.post('/', requireAuth, perUser(10), imageUpload, asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  if (!req.file && !body.description) throw new HttpError(400, 'Attach a photo or describe the issue');

  let fields = null;
  let saved = null;
  if (req.file) {
    const type = detectImageType(req.file.buffer);
    if (!type) throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');
    if (aiEnabled()) {
      try {
        fields = await analyzeIssueImage({ buffer: req.file.buffer, mime: type.mime });
        if (fields && fields.isValid === false) {
          throw new HttpError(400, fields.rejectionReason || 'The uploaded photo does not appear to show a valid civic infrastructure issue.');
        }
      } catch (e) {
        if (e.status === 400) throw e;
        console.warn('AI analysis temporarily unavailable, proceeding with citizen category:', e.message);
      }
    }
    saved = await saveImage(req.file.buffer);
  }
  if (!fields) {
    if (!body.category && !body.description) throw new HttpError(400, 'AI analysis is unavailable: choose a category or describe the issue');
    fields = sanitizeIssueReport({
      category: body.category || 'other',
      description: body.description || 'Public issue reported by citizen',
      severity: 'medium',
      priority: 5,
    });
  }
  if (fields.isValid === false) {
    throw new HttpError(400, fields.rejectionReason || 'The uploaded photo was rejected as non-civic.');
  }
  if (body.category && CATEGORIES.includes(body.category)) {
    fields.category = body.category;
    if (DEPARTMENTS[body.category]) fields.department = DEPARTMENTS[body.category];
  }
  if (body.description && body.description.trim()) {
    fields.description = body.description.trim(); // the citizen's own words win
  }
  if (!fields.description || !fields.description.trim()) {
    fields.description = `${fields.category || 'Civic infrastructure'} issue reported by citizen.`;
  }

  const addressData = body.address || {
    area: body.area || '',
    city: body.city || '',
    state: body.state || '',
    country: body.country || '',
    pincode: body.pincode || '',
    formatted: body.formattedAddress || '',
  };

  const report = await Report.create({
    ...fields,
    location: { type: 'Point', coordinates: [body.lng, body.lat] },
    address: addressData,
    image: saved?.name,
    user: req.user._id,
    userName: req.user.name,
  });
  res.status(201).json({ report: serializeReport(report, req.user._id, req.user.role) });
}));

router.post('/:id/letter', requireAuth, perUser(30), asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new HttpError(404, 'Report not found');
  if (String(report.user) !== String(req.user._id)) {
    throw new HttpError(403, 'Only the original author who filed this report can write or access the complaint letter');
  }
  if (!report.complaintLetter) {
    const shape = {
      ...report.toObject(),
      lat: report.location.coordinates[1],
      lng: report.location.coordinates[0],
      address: report.address || null,
    };
    let letter;
    try { letter = aiEnabled() ? await writeComplaintLetter(shape) : complaintTemplate(shape); }
    catch { letter = complaintTemplate(shape); }
    report.complaintLetter = letter;
    await report.save();
  }
  res.json({ letter: report.complaintLetter });
}));

router.put('/:id/letter', requireAuth, asyncHandler(async (req, res) => {
  const { letter } = z.object({ letter: z.string().max(10000) }).parse(req.body);
  const report = await Report.findById(req.params.id);
  if (!report) throw new HttpError(404, 'Report not found');
  if (String(report.user) !== String(req.user._id)) {
    throw new HttpError(403, 'Only the original author who filed this report can edit the complaint letter');
  }
  report.complaintLetter = letter;
  await report.save();
  res.json({ letter: report.complaintLetter });
}));

// One vote per user, switchable; atomic update operators, no read-modify-write race.
router.post('/:id/vote', requireAuth, asyncHandler(async (req, res) => {
  const { type } = z.object({ type: z.enum(['up', 'down']) }).parse(req.body);
  const _id = req.params.id;
  const uid = req.user._id;
  const changed = await Report.updateOne({ _id, 'votes.user': uid }, { $set: { 'votes.$.type': type } });
  if (!changed.matchedCount) {
    const added = await Report.updateOne({ _id, 'votes.user': { $ne: uid } }, { $push: { votes: { user: uid, type } } });
    if (!added.matchedCount) throw new HttpError(404, 'Report not found');
  }
  const report = await Report.findById(_id);
  const up = report.votes.filter((v) => v.type === 'up').length;
  if (up >= 5 && report.status === 'reported') { report.status = 'under_review'; await report.save(); }
  res.json({ report: serializeReport(report, uid, req.user?.role) });
}));

router.post('/:id/verify', requireAuth, asyncHandler(async (req, res) => {
  const _id = req.params.id;
  const uid = req.user._id;
  const existing = await Report.findById(_id);
  if (!existing) throw new HttpError(404, 'Report not found');
  if (String(existing.user) === String(uid)) throw new HttpError(403, 'You cannot verify your own report');
  await Report.updateOne({ _id }, { $addToSet: { verifiedBy: uid } });
  const report = await Report.findById(_id);
  if (report.verifiedBy.length >= 3 && report.status === 'reported') { report.status = 'verified'; await report.save(); }
  res.json({ report: serializeReport(report, uid, req.user?.role) });
}));

router.patch('/:id/status', requireRole('admin'), asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(STATUSES) }).parse(req.body);
  const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!report) throw new HttpError(404, 'Report not found');
  res.json({ report: serializeReport(report, req.user._id, req.user.role) });
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndDelete(req.params.id);
  if (!report) throw new HttpError(404, 'Report not found');
  await removeImage(report.image);
  res.status(204).end();
}));

export default router;
