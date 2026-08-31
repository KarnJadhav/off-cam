import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true },
    companyLogo: { type: String, trim: true },
    role: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    salary: { type: String, required: true, trim: true },
    batch: [{ type: String, trim: true }],
    branch: [{ type: String, trim: true }],
    experience: { type: String, required: true, default: 'Freshers', trim: true },
    deadline: Date,
    expiryDate: Date,
    applyLink: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    eligibility: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    selectionProcess: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    jobType: { type: String, enum: ['Full Time', 'Internship', 'Internship + PPO'], default: 'Full Time' },
    remote: { type: Boolean, default: false },
    workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], default: 'On-site' },
    status: { type: String, enum: ['draft', 'published', 'expired'], default: 'published' },
    source: { type: String, enum: ['dashboard', 'telegram'], default: 'dashboard' },
    views: { type: Number, default: 0 },
    isPremium: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

jobSchema.index({ company: 'text', role: 'text', description: 'text', tags: 'text' });
jobSchema.index({ createdAt: -1, isActive: 1, isDeleted: 1, isPremium: 1, status: 1 });
jobSchema.index({ applyLink: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const Job = mongoose.model('Job', jobSchema);
