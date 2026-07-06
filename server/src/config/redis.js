import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1
});

export async function connectRedis() {
  try {
    await redis.connect();
    console.log('Redis connected');
  } catch (error) {
    console.warn('Redis unavailable; continuing without cache:', error.message);
  }
}
