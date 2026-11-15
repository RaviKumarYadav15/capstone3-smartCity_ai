import mongoose from 'mongoose';

const tenderSchema = new mongoose.Schema({
  tenderId: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9-]{3,40}$/ },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  budget: { type: Number, required: true, min: 1 },
  department: { type: String, required: true, maxlength: 100 },
  contractor: { type: String, required: true, trim: true, maxlength: 120 },
  location: { type: String, trim: true, maxlength: 160 },
  deadline: Date,
  warranty: { type: String, maxlength: 160 },
  specs: { type: String, maxlength: 2000 },
  status: { type: String, enum: ['sanctioned', 'in_progress', 'completed'], default: 'sanctioned' },
  // AI output is an ESTIMATE only: no "integrity score" is stored because no real rate data backs it.
  aiBreakdown: {
    estimate: Boolean,
    table: [{ _id: false, component: String, specs: String, summary: String, amount: Number, share: String }],
    warrantyNotes: String,
    checklist: [String],
    feasibility: {
      verdict: { type: String, enum: ['within_benchmark', 'flagged_variance', 'human_audit_needed'], default: 'human_audit_needed' },
      summary: String,
      keyObservations: [String],
      citizenQuestions: [String],
      approved: { type: Boolean, default: false },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    generatedAt: Date,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Tender = mongoose.model('Tender', tenderSchema);

export const serializeTender = (doc, disputeCount = 0, userRole = null) => {
  const t = doc.toObject ? doc.toObject() : doc;
  let aiBreakdown = (t.aiBreakdown?.table?.length || t.aiBreakdown?.feasibility) ? { ...t.aiBreakdown } : null;
  if (aiBreakdown?.feasibility) {
    const isPrivileged = userRole === 'admin' || userRole === 'authority';
    const isApproved = Boolean(aiBreakdown.feasibility.approved);
    if (!isApproved && !isPrivileged) {
      aiBreakdown.feasibility = {
        ...aiBreakdown.feasibility,
        verdict: 'human_audit_needed',
        summary: 'Automated preliminary estimate generated. Pending review and verification by municipal authority.',
        unreviewed: true,
      };
    }
  }
  return {
    tenderId: t.tenderId, title: t.title, budget: t.budget, department: t.department, contractor: t.contractor,
    location: t.location, deadline: t.deadline, warranty: t.warranty, specs: t.specs, status: t.status,
    aiBreakdown,
    disputeCount, createdAt: t.createdAt,
  };
};
