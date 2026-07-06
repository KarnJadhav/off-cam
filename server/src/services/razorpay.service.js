import crypto from 'crypto';
import { getRazorpayClient } from '../config/razorpay.js';

export async function createPremiumOrder(userId) {
  const amount = Number(process.env.PREMIUM_MONTHLY_AMOUNT || 39900);
  if (!Number.isInteger(amount) || amount < 100) {
    const error = new Error('PREMIUM_MONTHLY_AMOUNT must be an integer amount in paise and at least 100');
    error.statusCode = 400;
    throw error;
  }

  const razorpay = getRazorpayClient();
  return razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: { userId: userId.toString(), plan: 'quarterly' }
  });
}

export function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body)
    .digest('hex');
  return expected === razorpaySignature;
}

export function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}
