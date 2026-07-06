import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    razorpayOrderId: { type: String, required: true, index: true },
    razorpayPaymentId: { type: String, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    plan: { type: String, enum: ['quarterly'], default: 'quarterly' },
    paidAt: Date
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);
