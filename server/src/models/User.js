import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['citizen', 'authority', 'admin'], default: 'citizen' },
  tokenVersion: { type: Number, default: 0 },
  strikes: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['active', 'warned', 'suspended', 'banned'], default: 'active' },
  suspendedUntil: { type: Date, default: null },
  isBlocked: { type: Boolean, default: false },
  blockReason: { type: String, default: '', maxlength: 500 },
  strikeHistory: [{
    _id: false,
    reason: { type: String, required: true }, // e.g. 'fake_prank', 'spam', 'not_civic', 'duplicate', 'other'
    note: { type: String, default: '', maxlength: 1000 },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
    reportTitle: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedByName: { type: String, default: 'Authority' },
  }],
}, { timestamps: true });

userSchema.methods.getRestrictionStatus = function getRestrictionStatus() {
  if (this.isBlocked) {
    return {
      isRestricted: true,
      status: 'banned',
      reason: this.blockReason || 'Account manually restricted by administration.',
      strikes: this.strikes ?? 0,
      suspendedUntil: null,
    };
  }

  const strikeCount = this.strikes ?? 0;
  if (this.status === 'banned' || strikeCount >= 3) {
    return {
      isRestricted: true,
      status: 'banned',
      reason: this.blockReason || 'Account indefinitely restricted due to 3 or more verified false/invalid reports.',
      strikes: strikeCount,
      suspendedUntil: null,
    };
  }

  if (this.status === 'suspended' || strikeCount === 2) {
    if (this.suspendedUntil && new Date(this.suspendedUntil) > new Date()) {
      return {
        isRestricted: true,
        status: 'suspended',
        reason: 'Account temporarily suspended for 7 days due to repeated false/invalid reports.',
        strikes: strikeCount,
        suspendedUntil: this.suspendedUntil,
      };
    }
    // If cooldown has elapsed, restore to warned status
    return {
      isRestricted: false,
      status: 'warned',
      reason: '7-day cooldown elapsed. Further invalid reports will result in an indefinite ban.',
      strikes: strikeCount,
      suspendedUntil: null,
    };
  }

  if (this.status === 'warned' || strikeCount === 1) {
    return {
      isRestricted: false,
      status: 'warned',
      reason: '1 warning strike on record for an invalid report.',
      strikes: strikeCount,
      suspendedUntil: null,
    };
  }

  return {
    isRestricted: false,
    status: 'active',
    reason: '',
    strikes: 0,
    suspendedUntil: null,
  };
};

userSchema.methods.toPublic = function toPublic() {
  const r = this.getRestrictionStatus ? this.getRestrictionStatus() : { isRestricted: false, status: this.status || 'active', strikes: this.strikes || 0 };
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    strikes: this.strikes ?? 0,
    status: r.status,
    isRestricted: r.isRestricted,
    restrictionReason: r.reason,
    suspendedUntil: r.suspendedUntil,
    isBlocked: Boolean(this.isBlocked),
    strikeHistory: this.strikeHistory || [],
  };
};

export const User = mongoose.model('User', userSchema);
