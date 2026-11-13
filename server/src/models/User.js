import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['citizen', 'authority', 'admin'], default: 'citizen' },
}, { timestamps: true });

userSchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), name: this.name, email: this.email, role: this.role };
};

export const User = mongoose.model('User', userSchema);
