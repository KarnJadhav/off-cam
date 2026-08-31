import { Job } from '../models/Job.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { jobSchema } from '../utils/validators.js';
import { createJobFromSource, deleteJobByAdmin, duplicateJobByAdmin, updateJobByAdmin } from '../services/job.service.js';

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export const overview = asyncHandler(async (_req, res) => {
  const today = startOfToday();
  const thirtyDaysAgo = addDays(-30);
  const [
    totalUsers,
    premiumUsers,
    activeJobs,
    revenueAgg,
    todaysSignups,
    todaysPayments,
    jobsPostedToday,
    expiringPlans,
    publishedJobs,
    draftJobs,
    expiredJobs,
    recentPayments,
    recentUsers,
    recentJobs
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isPremium: true, subscriptionExpiry: { $gt: new Date() } }),
    Job.countDocuments({ isActive: true, isDeleted: false, status: 'published' }),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    User.countDocuments({ createdAt: { $gte: today } }),
    Payment.countDocuments({ status: 'paid', paidAt: { $gte: today } }),
    Job.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ isPremium: true, subscriptionExpiry: { $gte: new Date(), $lte: addDays(7) } }),
    Job.countDocuments({ isDeleted: false, status: 'published' }),
    Job.countDocuments({ isDeleted: false, status: 'draft' }),
    Job.countDocuments({ isDeleted: false, status: 'expired' }),
    Payment.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(8).populate('userId', 'name email').lean(),
    User.find({ createdAt: { $gte: thirtyDaysAgo } }).sort({ createdAt: -1 }).limit(30).select('name email isPremium createdAt').lean(),
    Job.find({ createdAt: { $gte: thirtyDaysAgo } }).sort({ createdAt: -1 }).limit(30).select('company role createdAt').lean()
  ]);

  res.json({
    summary: {
      totalUsers,
      premiumUsers,
      activeJobs,
      revenue: revenueAgg[0]?.total || 0,
      todaysSignups,
      todaysPayments,
      jobsPostedToday,
      expiringPlans,
      publishedJobs,
      draftJobs,
      expiredJobs
    },
    charts: {
      revenue: recentPayments.map((payment) => ({
        label: new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-IN'),
        value: payment.amount
      })),
      registrations: recentUsers.map((user) => ({
        label: new Date(user.createdAt).toLocaleDateString('en-IN'),
        value: 1
      })),
      premiumGrowth: recentUsers
        .filter((user) => user.isPremium)
        .map((user) => ({
          label: new Date(user.createdAt).toLocaleDateString('en-IN'),
          value: 1
        })),
      jobsPosted: recentJobs.map((job) => ({
        label: new Date(job.createdAt).toLocaleDateString('en-IN'),
        value: 1
      }))
    }
  });
});

export const listJobsAdmin = asyncHandler(async (req, res) => {
  const filters = { isDeleted: false };
  if (req.query.status) filters.status = req.query.status;
  if (req.query.q) filters.$text = { $search: req.query.q };
  const jobs = await Job.find(filters).sort({ createdAt: -1 }).limit(200).populate('postedBy', 'name email').lean();
  res.json({ jobs });
});

export const createJob = asyncHandler(async (req, res) => {
  const data = jobSchema.parse(req.body);
  const { job, notifications } = await createJobFromSource(data, req.user._id, data.source || 'dashboard');
  res.status(201).json({ job, notifications });
});

export const updateJob = asyncHandler(async (req, res) => {
  const data = jobSchema.partial().parse(req.body);
  const { job, notifications } = await updateJobByAdmin(req.params.id, data);
  res.json({ job, notifications });
});

export const deleteJob = asyncHandler(async (req, res) => {
  await deleteJobByAdmin(req.params.id);
  res.json({ message: 'Job soft deleted' });
});

export const duplicateJob = asyncHandler(async (req, res) => {
  const copy = await duplicateJobByAdmin(req.params.id, req.user._id);
  res.status(201).json({ job: copy });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(100).select('-password').lean();
  res.json({ users });
});

export const updateUserAdmin = asyncHandler(async (req, res) => {
  const allowed = ['isBlocked', 'isPremium', 'subscriptionExpiry', 'subscriptionPlan'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }

  if (req.body.extendDays) {
    const current = req.body.subscriptionExpiry ? new Date(req.body.subscriptionExpiry) : new Date();
    updates.subscriptionExpiry = new Date(Math.max(current.getTime(), Date.now()) + Number(req.body.extendDays) * 24 * 60 * 60 * 1000);
    updates.isPremium = true;
    updates.subscriptionPlan = 'quarterly';
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

export const deleteUserAdmin = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deleted' });
});

export const premiumSubscribers = asyncHandler(async (_req, res) => {
  const users = await User.find({ isPremium: true }).sort({ subscriptionExpiry: 1 }).select('-password').lean();
  res.json({ users });
});

export const listPayments = asyncHandler(async (req, res) => {
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  const payments = await Payment.find(filters).sort({ createdAt: -1 }).limit(200).populate('userId', 'name email').lean();
  res.json({ payments });
});

export const sendNotification = asyncHandler(async (req, res) => {
  const { title, message, audience = 'all', delivery = [] } = req.body;
  if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });

  const userFilter = audience === 'premium' ? { isPremium: true } : audience === 'free' ? { isPremium: false } : {};
  const recipientCount = await User.countDocuments(userFilter);

  res.json({
    message: 'Notification queued for delivery',
    notification: { title, message, audience, delivery, recipientCount }
  });
});

export const adminSettings = asyncHandler(async (_req, res) => {
  res.json({
    websiteName: 'Off-Cam',
    supportEmail: process.env.EMAIL_FROM || '',
    premiumPrice: Number(process.env.PREMIUM_MONTHLY_AMOUNT || 0),
    subscriptionDays: Number(process.env.PREMIUM_DURATION_DAYS || 90),
    razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    emailConfigured: Boolean(process.env.SMTP_HOST),
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_PREMIUM_GROUP_LINK)
  });
});
