import crypto from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { Report, serializeReport, STATUSES } from '../models/Report.js';
import { User } from '../models/User.js';
import { asyncHandler, HttpError, escapeRegex } from '../utils/HttpError.js';
import { requireAuth, requireRole, requireGoodStanding } from '../middleware/auth.js';
import { imageUpload, saveImage, removeImage } from '../middleware/upload.js';
import { perUser } from '../middleware/limits.js';
import { aiEnabled, analyzeIssueImage, writeComplaintLetter } from '../services/gemini.js';
import { complaintTemplate } from '../services/letters.js';
import { sanitizeIssueReport, CATEGORIES, DEPARTMENTS, LEVELS } from '../utils/sanitize.js';
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
  aiToken: z.string().optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  const { status, severity, city, bbox } = req.query;
  if (typeof status === 'string' && STATUSES.includes(status)) {
    filter.status = status;
  } else if (!req.user || !['admin', 'authority'].includes(req.user.role)) {
    // Hide rejected/fraudulent reports from standard public/citizen feeds and city map
    filter.status = { $ne: 'rejected' };
  }
  if (typeof severity === 'string' && LEVELS.includes(severity)) filter.severity = severity;

  if (typeof city === 'string' && city.trim()) {
    const rx = new RegExp(escapeRegex(city.trim().slice(0, 100)), 'i');
    filter.$or = [{ 'address.city': rx }, { city: rx }, { 'address.formatted': rx }, { formattedAddress: rx }];
  }

  if (typeof bbox === 'string') {
    const parts = bbox.split(',').map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLng, minLat, maxLng, maxLat] = parts;
      filter.location = {
        $geoWithin: {
          $box: [
            [Math.max(-180, Math.min(180, minLng)), Math.max(-90, Math.min(90, minLat))],
            [Math.max(-180, Math.min(180, maxLng)), Math.max(-90, Math.min(90, maxLat))],
          ],
        },
      };
    }
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const skip = (page - 1) * limit;

  const [total, docs] = await Promise.all([
    Report.countDocuments(filter),
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  res.json({
    reports: docs.map((d) => serializeReport(d, req.user?._id, req.user?.role)),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new HttpError(404, 'Report not found');
  res.json({ report: serializeReport(report, req.user?._id, req.user?.role) });
}));

// Instant AI image description and category detector
router.post('/describe', requireAuth, requireGoodStanding, perUser(20), imageUpload, asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please select or upload a photo first');
  const type = detectImageType(req.file.buffer);
  if (!type) throw new HttpError(400, 'Only JPEG, PNG or WebP images are supported');
  if (!aiEnabled()) throw new HttpError(503, 'AI features are not configured');

  try {
    const analysis = await analyzeIssueImage({ buffer: req.file.buffer, mime: type.mime });
    if (analysis.isValid === false) {
      return res.json({
        isValid: false,
        rejectionReason: analysis.rejectionReason || 'The uploaded photo does not appear to show a valid civic infrastructure issue.',
      });
    }

    const imageHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const token = jwt.sign(
      {
        isValid: true,
        category: analysis.category || 'other',
        severity: analysis.severity || 'medium',
        department: analysis.department || '',
        priority: analysis.priority || 5,
        steps: analysis.steps || '',
        fixTime: analysis.fixTime || '',
        imageHash,
      },
      env.jwtSecret,
      { expiresIn: '1h' }
    );

    return res.json({
      isValid: true,
      category: analysis.category || 'other',
      description: analysis.description || '',
      severity: analysis.severity || 'medium',
      department: analysis.department || '',
      priority: analysis.priority || 5,
      steps: analysis.steps || '',
      token,
    });
  } catch (err) {
    console.error('Image analysis error in /describe:', err);
    if (err instanceof HttpError && err.status === 400) {
      return res.json({
        isValid: false,
        rejectionReason: err.message,
      });
    }
    throw new HttpError(503, err.message || 'AI verification service is temporarily unavailable. Please try again.');
  }
}));

router.post('/', requireAuth, requireGoodStanding, perUser(10), imageUpload, asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  if (!req.file && !body.description) throw new HttpError(400, 'Attach a photo or describe the issue');

  let fields = null;
  let saved = null;
  let needsReview = false;

  if (req.file) {
    const type = detectImageType(req.file.buffer);
    if (!type) throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');
    const imageHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    // 1. Try to reuse signed AI analysis token if provided by client
    if (body.aiToken) {
      try {
        const decoded = jwt.verify(body.aiToken, env.jwtSecret);
        if (decoded && decoded.isValid && decoded.imageHash === imageHash) {
          fields = sanitizeIssueReport(decoded);
        }
      } catch (tokenErr) {
        console.warn('Invalid or expired AI token:', tokenErr.message);
      }
    }

    // 2. Server-side photo check: if no valid token, run the AI check directly
    if (!fields) {
      if (aiEnabled()) {
        try {
          const analysis = await analyzeIssueImage({ buffer: req.file.buffer, mime: type.mime });
          if (analysis && analysis.isValid === false) {
            throw new HttpError(400, analysis.rejectionReason || 'The uploaded photo does not appear to show a valid civic infrastructure issue.');
          }
          fields = sanitizeIssueReport(analysis);
        } catch (e) {
          if (e.status === 400) throw e;
          console.warn('AI analysis temporarily unavailable, saving report flagged needsReview:', e.message);
          needsReview = true;
        }
      } else {
        needsReview = true;
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
  if (!CATEGORIES.includes(fields.category)) fields.category = 'other';
  if (!LEVELS.includes(fields.severity)) fields.severity = 'medium';
  if (!LEVELS.includes(fields.risk)) fields.risk = 'medium';
  if (!fields.priority || isNaN(fields.priority)) fields.priority = 5;

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
    needsReview,
    user: req.user._id,
    userName: req.user.name,
  });
  res.status(201).json({ report: serializeReport(report, req.user._id, req.user.role) });
}));

router.post('/:id/letter', requireAuth, requireGoodStanding, perUser(30), asyncHandler(async (req, res) => {
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

router.put('/:id/letter', requireAuth, requireGoodStanding, asyncHandler(async (req, res) => {
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

// One vote per user, toggleable and switchable; atomic update operators, no read-modify-write race.
router.post('/:id/vote', requireAuth, requireGoodStanding, asyncHandler(async (req, res) => {
  const { type } = z.object({ type: z.enum(['up', 'down']) }).parse(req.body);
  const _id = req.params.id;
  const uid = req.user._id;

  const existing = await Report.findOne({ _id, 'votes.user': uid }, { 'votes.$': 1 });
  if (existing?.votes?.length && existing.votes[0].type === type) {
    // Clicking the same reaction again toggles it off (retracts vote)
    await Report.updateOne({ _id }, { $pull: { votes: { user: uid } } });
  } else if (existing?.votes?.length) {
    // Switch between up and down votes
    await Report.updateOne({ _id, 'votes.user': uid }, { $set: { 'votes.$.type': type } });
  } else {
    // New vote
    const added = await Report.updateOne({ _id }, { $push: { votes: { user: uid, type } } });
    if (!added.matchedCount) throw new HttpError(404, 'Report not found');
  }

  const report = await Report.findById(_id);
  const up = report.votes.filter((v) => v.type === 'up').length;
  if (up >= 5 && report.status === 'reported') { report.status = 'under_review'; await report.save(); }
  res.json({ report: serializeReport(report, uid, req.user?.role) });
}));

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.post('/:id/verify', requireAuth, requireGoodStanding, asyncHandler(async (req, res) => {
  const _id = req.params.id;
  const uid = req.user._id;
  const existing = await Report.findById(_id);
  if (!existing) throw new HttpError(404, 'Report not found');
  if (existing.status !== 'reported') {
    throw new HttpError(400, 'This issue has already been reviewed and verified');
  }
  if (String(existing.user) === String(uid)) throw new HttpError(403, 'You cannot verify your own report');

  const isStaff = ['admin', 'authority'].includes(req.user.role);
  if (!isStaff) {
    const { lat, lng } = z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    }).parse(req.body);

    const [reportLng, reportLat] = existing.location?.coordinates || [];
    if (typeof reportLat === 'number' && typeof reportLng === 'number') {
      const dist = haversineDistanceKm(lat, lng, reportLat, reportLng);
      const MAX_VERIFY_DIST_KM = 0.25; // 250 meters physical eyewitness proximity
      if (dist > MAX_VERIFY_DIST_KM) {
        const readableDist = dist < 1 ? `${Math.round(dist * 1000)} meters` : `${dist.toFixed(1)} km`;
        throw new HttpError(403, `Verification requires physical proximity: you must be within 250 meters of the issue on-ground to authenticate it (you are ${readableDist} away)`);
      }
    }
  }

  await Report.updateOne({ _id }, { $addToSet: { verifiedBy: uid } });
  const report = await Report.findById(_id);
  if (report.verifiedBy.length >= 3 && report.status === 'reported') { report.status = 'verified'; await report.save(); }
  res.json({ report: serializeReport(report, uid, req.user?.role) });
}));

router.patch('/:id/status', requireRole('authority', 'admin'), asyncHandler(async (req, res) => {
  const { status, resolutionNotes, rejectionCategory, rejectionReason } = z.object({
    status: z.enum(STATUSES),
    resolutionNotes: z.string().max(1000).optional(),
    rejectionCategory: z.enum(['fake_prank', 'spam', 'not_civic', 'duplicate', 'other']).optional(),
    rejectionReason: z.string().max(1000).optional(),
  }).parse(req.body);

  const existing = await Report.findById(req.params.id);
  if (!existing) throw new HttpError(404, 'Report not found');

  const update = { status };

  if (status === 'resolved') {
    update.resolvedBy = req.user._id;
    update.resolvedAt = new Date();
    if (resolutionNotes) update.resolutionNotes = resolutionNotes;
    update.rejectedBy = null;
    update.rejectedAt = null;
    update.rejectionCategory = null;
    update.rejectionReason = null;
  } else if (status === 'rejected') {
    update.rejectedBy = req.user._id;
    update.rejectedAt = new Date();
    update.rejectionCategory = rejectionCategory || 'fake_prank';
    update.rejectionReason = rejectionReason || 'Report verified as false or invalid by municipal authority.';
    update.resolvedBy = null;
    update.resolvedAt = null;

    // Apply strike to the citizen author unless marked as duplicate
    if (existing.status !== 'rejected' && existing.user && rejectionCategory !== 'duplicate') {
      const author = await User.findById(existing.user);
      if (author && author.role === 'citizen') {
        author.strikes = (author.strikes || 0) + 1;
        author.strikeHistory = author.strikeHistory || [];
        author.strikeHistory.push({
          reason: rejectionCategory || 'fake_prank',
          note: rejectionReason || 'Report rejected as false or invalid by municipal authority.',
          reportId: existing._id,
          reportTitle: `${existing.category} · ${existing.address?.city || existing.address?.formatted || 'Incident location'}`,
          createdAt: new Date(),
          appliedBy: req.user._id,
          appliedByName: req.user.name,
        });

        if (author.strikes === 1) {
          author.status = 'warned';
        } else if (author.strikes === 2) {
          author.status = 'suspended';
          author.suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day cooldown
        } else if (author.strikes >= 3) {
          author.status = 'banned';
          author.isBlocked = true;
          author.blockReason = 'Indefinite restriction: 3 or more verified false or invalid reports.';
        }
        await author.save();
      }
    }
  } else {
    // If previously rejected, reverse the strike upon changing to an active/investigative status
    if (existing.status === 'rejected' && existing.user && existing.rejectionCategory !== 'duplicate') {
      const author = await User.findById(existing.user);
      if (author && author.strikes > 0) {
        author.strikes = Math.max(0, author.strikes - 1);
        author.strikeHistory = (author.strikeHistory || []).filter(
          (s) => String(s.reportId) !== String(existing._id)
        );
        if (author.strikes === 0) {
          author.status = 'active';
          author.isBlocked = false;
          author.suspendedUntil = null;
        } else if (author.strikes === 1) {
          author.status = 'warned';
          author.isBlocked = false;
          author.suspendedUntil = null;
        } else if (author.strikes === 2) {
          author.status = 'suspended';
        }
        await author.save();
      }
    }
    update.resolvedBy = null;
    update.resolvedAt = null;
    update.rejectedBy = null;
    update.rejectedAt = null;
    update.rejectionCategory = null;
    update.rejectionReason = null;
  }

  const report = await Report.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json({ report: serializeReport(report, req.user._id, req.user.role) });
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndDelete(req.params.id);
  if (!report) throw new HttpError(404, 'Report not found');
  await removeImage(report.image);
  res.status(204).end();
}));

export default router;
