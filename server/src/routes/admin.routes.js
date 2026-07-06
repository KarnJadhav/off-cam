import { Router } from 'express';
import {
  adminSettings,
  createJob,
  deleteJob,
  deleteUserAdmin,
  duplicateJob,
  listJobsAdmin,
  listPayments,
  listUsers,
  overview,
  premiumSubscribers,
  sendNotification,
  updateJob,
  updateUserAdmin
} from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/overview', overview);
router.get('/jobs', listJobsAdmin);
router.post('/job', createJob);
router.put('/job/:id', updateJob);
router.delete('/job/:id', deleteJob);
router.post('/job/:id/duplicate', duplicateJob);
router.get('/users', listUsers);
router.put('/users/:id', updateUserAdmin);
router.delete('/users/:id', deleteUserAdmin);
router.get('/premium-users', premiumSubscribers);
router.get('/payments', listPayments);
router.post('/notifications', sendNotification);
router.get('/settings', adminSettings);

export default router;
