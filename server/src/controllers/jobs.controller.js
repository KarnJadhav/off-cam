import { Job } from '../models/Job.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getJson, setJson } from '../services/redis.service.js';

function buildFilters(query, premiumOnly = false) {
  const filters = { isActive: true };
  if (premiumOnly) filters.isPremium = true;
  if (query.batch) filters.batch = query.batch;
  if (query.branch) filters.branch = query.branch;
  if (query.experience) filters.experience = new RegExp(query.experience, 'i');
  if (query.jobType) filters.jobType = query.jobType;
  if (query.workMode) filters.workMode = query.workMode;
  if (query.q) filters.$text = { $search: query.q };
  return filters;
}

export const listJobs = asyncHandler(async (req, res) => {
  const cacheKey = `jobs:${JSON.stringify(req.query)}`;
  const cached = await getJson(cacheKey);
  if (cached) return res.json(cached);

  const filters = buildFilters(req.query);
  const jobs = await Job.find(filters).sort({ createdAt: -1 }).limit(60).lean();
  const payload = { jobs };
  await setJson(cacheKey, payload, 180);
  res.json(payload);
});

export const searchJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find(buildFilters(req.query)).sort({ createdAt: -1 }).limit(60).lean();
  res.json({ jobs });
});

export const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!job) return res.status(404).json({ message: 'Job not found' });
  res.json({ job });
});

export const listPremiumJobs = asyncHandler(async (req, res) => {
  const preferences = req.user.preferences || {};
  const filters = buildFilters({ ...preferences, ...req.query }, true);
  const jobs = await Job.find(filters).sort({ createdAt: -1 }).limit(80).lean();
  res.json({
    telegramGroup: process.env.TELEGRAM_PREMIUM_GROUP_LINK || null,
    jobs
  });
});
