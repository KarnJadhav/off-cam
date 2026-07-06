import Redis from 'ioredis';

const redisEnabled = process.env.REDIS_ENABLED === 'true';

export const redis = redisEnabled
  ? new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null
    })
  : null;

export async function connectRedis() {
  if (!redisEnabled) {
    console.log('Redis disabled; cache, OTP, and JWT blacklist will use no-op fallbacks.');
    return;
  }

  redis.on('error', (error) => {
    console.warn('Redis error:', error.message);
  });

  try {
    await redis.connect();
    console.log('Redis connected');
  } catch (error) {
    console.warn('Redis unavailable; continuing without cache:', error.message);
  }
}
