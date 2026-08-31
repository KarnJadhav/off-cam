import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { clearByPattern, del } from './redis.service.js';
import { sendJobNotification } from './email.service.js';

function normalizeJobDates(data) {
  return {
    ...data,
    deadline: data.deadline ? new Date(data.deadline) : undefined,
    expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined
  };
}

export async function clearJobCache() {
  await Promise.all([del('jobs'), clearByPattern('jobs:*')]);
}

async function getPremiumRecipients() {
  return User.find({ isPremium: true, isBlocked: false }).select('name email telegramChatId').lean();
}

export async function queuePremiumJobNotifications(job) {
  if (job.status !== 'published') return { email: 0, telegram: 0, dashboard: 0 };

  const premiumUsers = await getPremiumRecipients();
  setImmediate(async () => {
    await Promise.allSettled(premiumUsers.map((user) => sendJobNotification(user, job)));
  });

  return {
    email: premiumUsers.length,
    telegram: process.env.TELEGRAM_BOT_TOKEN ? premiumUsers.filter((user) => user.telegramChatId).length : 0,
    dashboard: premiumUsers.length
  };
}

export async function assertNoDuplicateJob(applyLink, ignoreId) {
  const existing = await Job.findOne({
    applyLink,
    isDeleted: false,
    ...(ignoreId ? { _id: { $ne: ignoreId } } : {})
  }).select('_id company role');

  if (existing) {
    const error = new Error(`Job already exists: ${existing.company} - ${existing.role}`);
    error.statusCode = 409;
    throw error;
  }
}

export async function createJobFromSource(data, adminId, source = 'dashboard') {
  const normalized = normalizeJobDates({ ...data, source });
  await assertNoDuplicateJob(normalized.applyLink);
  const job = await Job.create({ ...normalized, postedBy: adminId });
  await clearJobCache();
  const notifications = await queuePremiumJobNotifications(job);
  return { job, notifications };
}

export async function updateJobByAdmin(id, data) {
  const normalized = normalizeJobDates(data);
  if (normalized.applyLink) await assertNoDuplicateJob(normalized.applyLink, id);
  const job = await Job.findOneAndUpdate({ _id: id, isDeleted: false }, normalized, { new: true });
  if (!job) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    throw error;
  }
  await clearJobCache();
  const notifications = normalized.status === 'published' ? await queuePremiumJobNotifications(job) : { email: 0, telegram: 0, dashboard: 0 };
  return { job, notifications };
}

export async function deleteJobByAdmin(id) {
  const job = await Job.findByIdAndUpdate(id, { isActive: false, isDeleted: true, status: 'expired' }, { new: true });
  if (!job) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    throw error;
  }
  await clearJobCache();
  return job;
}

export async function duplicateJobByAdmin(id, adminId) {
  const job = await Job.findOne({ _id: id, isDeleted: false }).lean();
  if (!job) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    throw error;
  }

  const { _id, createdAt, updatedAt, applyLink, ...data } = job;
  const copy = await Job.create({
    ...data,
    role: `${data.role} Copy`,
    applyLink: `${applyLink}${applyLink.includes('?') ? '&' : '?'}copy=${Date.now()}`,
    status: 'draft',
    isActive: true,
    isDeleted: false,
    postedBy: adminId
  });
  await clearJobCache();
  return copy;
}

export async function expirePublishedJobs() {
  const result = await Job.updateMany(
    {
      expiryDate: { $lt: new Date() },
      status: 'published',
      isDeleted: false
    },
    {
      status: 'expired',
      isActive: false
    }
  );

  if (result.modifiedCount) await clearJobCache();
  return result.modifiedCount;
}
