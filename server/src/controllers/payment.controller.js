import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createPremiumOrder, verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.service.js';

function expiryDate() {
  const days = Number(process.env.PREMIUM_DURATION_DAYS || 90);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function activatePremium(userId, paymentId) {
  await User.findByIdAndUpdate(userId, {
    isPremium: true,
    subscriptionPlan: 'quarterly',
    subscriptionExpiry: expiryDate()
  });

  await Payment.findByIdAndUpdate(paymentId, {
    status: 'paid',
    paidAt: new Date()
  });
}

export const createOrder = asyncHandler(async (req, res) => {
  const order = await createPremiumOrder(req.user._id);
  const payment = await Payment.create({
    userId: req.user._id,
    razorpayOrderId: order.id,
    amount: order.amount,
    currency: order.currency,
    status: 'created',
    plan: 'quarterly'
  });

  res.status(201).json({
    order,
    paymentId: payment._id,
    keyId: process.env.RAZORPAY_KEY_ID
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const razorpayOrderId = req.body.razorpayOrderId || req.body.razorpay_order_id;
  const razorpayPaymentId = req.body.razorpayPaymentId || req.body.razorpay_payment_id;
  const razorpaySignature = req.body.razorpaySignature || req.body.razorpay_signature;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'Razorpay payment details are required' });
  }

  const payment = await Payment.findOne({ razorpayOrderId, userId: req.user._id });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  const valid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
  if (!valid) return res.status(400).json({ message: 'Invalid payment signature' });

  payment.razorpayPaymentId = razorpayPaymentId;
  await payment.save();
  await activatePremium(req.user._id, payment._id);

  res.json({ message: 'Premium activated' });
});

export const paymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ payments });
});

export const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body;
  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  const event = JSON.parse(rawBody.toString());
  if (event.event === 'payment.captured') {
    const entity = event.payload.payment.entity;
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: entity.order_id },
      { razorpayPaymentId: entity.id },
      { new: true }
    );
    if (payment) await activatePremium(payment.userId, payment._id);
  }

  res.json({ received: true });
});
