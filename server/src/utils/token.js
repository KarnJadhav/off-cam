import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    jwtid: randomUUID()
  });
}

export function decodeToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
