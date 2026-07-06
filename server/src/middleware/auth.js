import { decodeToken } from '../utils/token.js';
import { User } from '../models/User.js';
import { isBlacklisted } from '../services/redis.service.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const payload = decodeToken(token);
    if (await isBlacklisted(payload.jti)) {
      return res.status(401).json({ message: 'Session has expired' });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    req.token = token;
    req.tokenPayload = payload;
    next();
  } catch (_error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
