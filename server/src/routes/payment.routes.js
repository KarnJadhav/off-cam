import { Router } from 'express';
import { createOrder, paymentHistory, verifyPayment, webhook } from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/create-order', requireAuth, createOrder);
router.post('/verify', requireAuth, verifyPayment);
router.get('/history', requireAuth, paymentHistory);
router.post('/webhook', webhook);

export default router;
