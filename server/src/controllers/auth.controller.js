import crypto from 'crypto';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, registerSchema } from '../utils/validators.js';
import { signToken } from '../utils/token.js';
import { blacklistToken, saveOtp, verifyOtp } from '../services/redis.service.js';

function sendToken(res, user, statusCode = 200) {
  const token = signToken(user);
  res.status(statusCode).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: user.isPremium,
      subscriptionExpiry: user.subscriptionExpiry,
      preferences: user.preferences
    }
  });
}

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const exists = await User.exists({ email: data.email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });

  const user = await User.create(data);
  const otp = crypto.randomInt(100000, 999999).toString();
  await saveOtp(user.email, otp);

  sendToken(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(data.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  sendToken(res, user);
});

export const logout = asyncHandler(async (req, res) => {
  await blacklistToken(req.tokenPayload?.jti, req.tokenPayload?.exp);
  res.json({ message: 'Logged out' });
});

export const verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  const valid = await verifyOtp(email.toLowerCase(), otp);
  if (!valid) return res.status(400).json({ message: 'Invalid or expired OTP' });

  await User.updateOne({ email: email.toLowerCase() }, { isEmailVerified: true });
  res.json({ message: 'Email verified' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
