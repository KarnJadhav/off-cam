import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const preferenceSchema = new mongoose.Schema(
  {
    batch: String,
    branch: String,
    roles: [String],
    locations: [String],
    experience: { type: String, enum: ['Fresher', '0-1 years', '0-2 years', '1-3 years', 'Any'], default: 'Any' },
    jobType: { type: String, enum: ['Full-time', 'Internship', 'Both'], default: 'Both' },
    workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site', 'Any'], default: 'Any' }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    telegramChatId: { type: String, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isPremium: { type: Boolean, default: false },
    subscriptionPlan: { type: String, enum: ['none', 'quarterly'], default: 'none' },
    subscriptionExpiry: Date,
    preferences: { type: preferenceSchema, default: () => ({}) },
    isEmailVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema);
