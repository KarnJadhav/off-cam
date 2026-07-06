import { Router } from 'express';
import { createJob, deleteJob, listUsers, updateJob } from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.post('/job', createJob);
router.put('/job/:id', updateJob);
router.delete('/job/:id', deleteJob);
router.get('/users', listUsers);

export default router;
