import { Queue } from 'bullmq';
import { connection } from './redis.config';

export const NotificationQueue = new Queue('notification-processing', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

// Export for easier testing and management
export default NotificationQueue;