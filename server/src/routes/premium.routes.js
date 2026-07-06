import { Router } from 'express';
import { listPremiumJobs } from '../controllers/jobs.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePremium } from '../middleware/premium.js';

const router = Router();

router.get('/jobs', requireAuth, requirePremium, listPremiumJobs);

export default router;
