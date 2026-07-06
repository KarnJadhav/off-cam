import { redis } from '../config/redis.js';

function isReady() {
  return redis.status === 'ready';
}

export async function getJson(key) {
  if (!isReady()) return null;
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

export async function setJson(key, value, ttlSeconds = 300) {
  if (!isReady()) return;
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function del(key) {
  if (!isReady()) return;
  await redis.del(key);
}

export async function clearByPattern(pattern) {
  if (!isReady()) return;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length) await redis.del(keys);
  } while (cursor !== '0');
}

export async function saveOtp(email, otp) {
  if (!isReady()) return;
  await redis.set(`otp:${email}`, otp, 'EX', 10 * 60);
}

export async function verifyOtp(email, otp) {
  if (!isReady()) return false;
  const saved = await redis.get(`otp:${email}`);
  if (saved !== otp) return false;
  await redis.del(`otp:${email}`);
  return true;
}

export async function blacklistToken(jti, exp) {
  if (!isReady() || !jti || !exp) return;
  const ttl = Math.max(0, exp - Math.floor(Date.now() / 1000));
  if (ttl > 0) await redis.set(`jwt:blacklist:${jti}`, '1', 'EX', ttl);
}

export async function isBlacklisted(jti) {
  if (!isReady() || !jti) return false;
  return Boolean(await redis.get(`jwt:blacklist:${jti}`));
}
