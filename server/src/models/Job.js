import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    salary: { type: String, trim: true },
    batch: [{ type: String, trim: true }],
    branch: [{ type: String, trim: true }],
    experience: { type: String, default: 'Fresher', trim: true },
    deadline: Date,
    applyLink: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    jobType: { type: String, enum: ['Full-time', 'Internship'], default: 'Full-time' },
    workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], default: 'On-site' },
    isPremium: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

jobSchema.index({ company: 'text', role: 'text', description: 'text', tags: 'text' });
jobSchema.index({ createdAt: -1, isActive: 1, isPremium: 1 });

export const Job = mongoose.model('Job', jobSchema);
