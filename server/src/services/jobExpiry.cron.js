import cron from 'node-cron';
import { expirePublishedJobs } from './job.service.js';

export function startJobExpiryCron() {
  cron.schedule('0 0 * * *', async () => {
    try {
      const expired = await expirePublishedJobs();
      if (expired) console.log(`Expired ${expired} jobs`);
    } catch (error) {
      console.error('Job expiry cron failed:', error.message);
    }
  });
}
