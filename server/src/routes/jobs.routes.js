import { Router } from 'express';
import { getJob, listJobs, searchJobs } from '../controllers/jobs.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listJobs);
router.get('/search', requireAuth, searchJobs);
router.get('/:id', requireAuth, getJob);

export default router;
