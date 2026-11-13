import { Router } from 'express';
import { Report } from '../models/Report.js';
import { Tender } from '../models/Tender.js';
import { Dispute } from '../models/Dispute.js';
import { asyncHandler } from '../utils/HttpError.js';
import { healthScore, healthLabel } from '../services/health.js';
import { aiEnabled, predictOutlook } from '../services/gemini.js';

const router = Router();

router.get('/config', (_req, res) => res.json({ aiEnabled: aiEnabled() }));

async function aggregateReports() {
  const rows = await Report.aggregate([{ $group: { _id: { status: '$status', severity: '$severity', category: '$category' }, n: { $sum: 1 } } }]);
  const out = { total: 0, resolved: 0, critical: 0, high: 0, openCritical: 0, openHigh: 0, openOther: 0, categories: {}, severity: {} };
  for (const { _id: k, n } of rows) {
    out.total += n;
    out.categories[k.category] = (out.categories[k.category] ?? 0) + n;
    out.severity[k.severity] = (out.severity[k.severity] ?? 0) + n;
    if (k.severity === 'critical') out.critical += n;
    if (k.severity === 'high') out.high += n;
    if (k.status === 'resolved') { out.resolved += n; continue; }
    if (k.severity === 'critical') out.openCritical += n;
    else if (k.severity === 'high') out.openHigh += n;
    else out.openOther += n;
  }
  return out;
}

router.get('/stats', asyncHandler(async (_req, res) => {
  const [r, tenderAgg, disputes] = await Promise.all([
    aggregateReports(),
    Tender.aggregate([{ $group: { _id: null, count: { $sum: 1 }, totalBudget: { $sum: '$budget' } } }]),
    Dispute.countDocuments({ status: { $ne: 'dismissed' } }),
  ]);
  const score = healthScore(r);
  res.json({
    reports: { total: r.total, critical: r.critical, high: r.high, resolved: r.resolved },
    categories: Object.entries(r.categories).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    health: { score, label: healthLabel(score) },
    tenders: { count: tenderAgg[0]?.count ?? 0, totalBudget: tenderAgg[0]?.totalBudget ?? 0, disputes },
  });
}));

// AI outlook is cached for 6 hours so page views never translate into Gemini calls.
let cache = { at: 0, value: null };
router.get('/predictions', asyncHandler(async (_req, res) => {
  if (!aiEnabled()) return res.json({ prediction: null });
  if (Date.now() - cache.at < 6 * 3600 * 1000) return res.json({ prediction: cache.value });
  const r = await aggregateReports();
  if (r.total < 2) return res.json({ prediction: null });
  try {
    cache = { at: Date.now(), value: await predictOutlook({ categories: r.categories, severity: r.severity, total: r.total }) };
  } catch (e) {
    console.warn('Prediction failed:', e.message);
    cache = { at: Date.now() - 5 * 3600 * 1000, value: cache.value }; // retry in ~1h
  }
  res.json({ prediction: cache.value });
}));

export default router;
