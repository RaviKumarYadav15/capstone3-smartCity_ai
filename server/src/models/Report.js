import mongoose from 'mongoose';
import { CATEGORIES, LEVELS, DEFAULT_STEPS } from '../utils/sanitize.js';

export const STATUSES = ['reported', 'verified', 'under_review', 'in_progress', 'resolved'];

const reportSchema = new mongoose.Schema({
  category: { type: String, enum: CATEGORIES, required: true },
  severity: { type: String, enum: LEVELS, required: true },
  risk: { type: String, enum: LEVELS, default: 'medium' },
  description: { type: String, required: true, maxlength: 2000 },
  department: { type: String, maxlength: 200 },
  priority: { type: Number, min: 1, max: 10, default: 5 },
  fixTime: { type: String, maxlength: 100 },
  steps: { type: String, maxlength: 3000 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  address: {
    area: { type: String, maxlength: 200, default: '' },
    city: { type: String, maxlength: 200, default: '' },
    state: { type: String, maxlength: 200, default: '' },
    country: { type: String, maxlength: 200, default: '' },
    pincode: { type: String, maxlength: 50, default: '' },
    formatted: { type: String, maxlength: 500, default: '' },
  },
  image: String, // file name inside UPLOAD_DIR
  status: { type: String, enum: STATUSES, default: 'reported', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String, // display name only; e-mail is never stored on public documents
  votes: [{ _id: false, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: { type: String, enum: ['up', 'down'] } }],
  verifiedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  complaintLetter: String,
}, { timestamps: true });

reportSchema.index({ location: '2dsphere' });
reportSchema.index({ createdAt: -1 });

export const Report = mongoose.model('Report', reportSchema);

export function serializeReport(doc, userId, userRole = null) {
  const r = doc.toObject ? doc.toObject() : doc;
  const votes = r.votes ?? [];
  const uid = userId ? String(userId) : null;
  const isAuthor = uid ? String(r.user) === uid : false;
  const canAccessLetter = isAuthor;

  return {
    id: String(r._id),
    category: r.category,
    severity: r.severity,
    risk: r.risk,
    description: r.description,
    department: r.department,
    priority: r.priority,
    fixTime: r.fixTime,
    steps: r.steps || DEFAULT_STEPS[r.category] || DEFAULT_STEPS.other || null, // Remediation steps visible to all stakeholders and citizens
    status: r.status,
    lat: r.location.coordinates[1],
    lng: r.location.coordinates[0],
    address: r.address ? {
      area: r.address.area || '',
      city: r.address.city || '',
      state: r.address.state || '',
      country: r.address.country || '',
      pincode: r.address.pincode || '',
      formatted: r.address.formatted || '',
    } : null,
    imageUrl: r.image ? (r.image.startsWith('http') ? r.image : `/uploads/${r.image}`) : null,
    userName: r.userName || 'Resident',
    createdAt: r.createdAt,
    upvotes: votes.filter((v) => v.type === 'up').length,
    downvotes: votes.filter((v) => v.type === 'down').length,
    verifications: (r.verifiedBy ?? []).length,
    myVote: uid ? votes.find((v) => String(v.user) === uid)?.type ?? null : null,
    iVerified: uid ? (r.verifiedBy ?? []).some((v) => String(v) === uid) : false,
    mine: isAuthor,
    hasLetter: canAccessLetter ? Boolean(r.complaintLetter) : false,
    complaintLetter: canAccessLetter ? (r.complaintLetter || null) : null,
  };
}
