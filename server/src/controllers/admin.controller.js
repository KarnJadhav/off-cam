import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { jobSchema } from '../utils/validators.js';
import { clearByPattern } from '../services/redis.service.js';

function normalizeJob(data) {
  return {
    ...data,
    deadline: data.deadline ? new Date(data.deadline) : undefined
  };
}

export const createJob = asyncHandler(async (req, res) => {
  const data = normalizeJob(jobSchema.parse(req.body));
  const job = await Job.create({ ...data, postedBy: req.user._id });
  await clearByPattern('jobs:*');
  res.status(201).json({ job });
});

export const updateJob = asyncHandler(async (req, res) => {
  const data = normalizeJob(jobSchema.partial().parse(req.body));
  const job = await Job.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!job) return res.status(404).json({ message: 'Job not found' });
  await clearByPattern('jobs:*');
  res.json({ job });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!job) return res.status(404).json({ message: 'Job not found' });
  await clearByPattern('jobs:*');
  res.json({ message: 'Job deactivated' });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(100).select('-password').lean();
  res.json({ users });
});
