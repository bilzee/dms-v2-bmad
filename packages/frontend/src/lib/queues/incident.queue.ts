import { Queue } from 'bullmq';
import { connection } from './redis.config';

export const IncidentQueue = new Queue('incident-processing', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Export for easier testing and management
export default IncidentQueue;