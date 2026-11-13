import mongoose from 'mongoose';

export const DISPUTE_CATEGORIES = ['Substandard Material Quality', 'Abandoned / Delayed Work', 'Ghost Project', 'Warranty Defect', 'Other'];

const disputeSchema = new mongoose.Schema({
  tenderId: { type: String, required: true, index: true },
  category: { type: String, enum: DISPUTE_CATEGORIES, required: true },
  description: { type: String, required: true, minlength: 20, maxlength: 2000 },
  image: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // moderation: a citizen claim is shown as "open" until an admin reviews or dismisses it
  status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open', index: true },
  letter: String,
}, { timestamps: true });

export const Dispute = mongoose.model('Dispute', disputeSchema);

export const serializeDispute = (doc, userId) => {
  const d = doc.toObject ? doc.toObject() : doc;
  const uid = userId ? String(userId) : null;
  return {
    id: String(d._id), tenderId: d.tenderId, category: d.category, description: d.description,
    imageUrl: d.image ? `/uploads/${d.image}` : null, userName: d.userName || 'Citizen',
    supportCount: (d.supporters ?? []).length,
    iSupported: uid ? (d.supporters ?? []).some((s) => String(s) === uid) : false,
    mine: uid ? String(d.user) === uid : false,
    status: d.status, letter: d.letter, createdAt: d.createdAt,
  };
};
