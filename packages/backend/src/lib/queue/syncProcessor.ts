import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import type { PriorityQueueItem } from '@dms/shared';

// Redis connection configuration
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Important for BullMQ workers
});

// Priority-based sync queue
export const syncQueue = new Queue('sync-priority-queue', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
});

// Priority-based job worker
export const syncWorker = new Worker(
  'sync-priority-queue',
  async (job: Job<PriorityQueueItem>) => {
    const queueItem = job.data;
    
    console.log(`Processing priority job ${job.id} with priority ${job.opts.priority}`);
    console.log(`Item type: ${queueItem.type}, action: ${queueItem.action}`);
    
    try {
      // Process the sync item based on type
      let result;
      
      switch (queueItem.type) {
        case 'ASSESSMENT':
          result = await processAssessmentSync(queueItem);
          break;
        case 'RESPONSE':
          result = await processResponseSync(queueItem);
          break;
        case 'MEDIA':
          result = await processMediaSync(queueItem);
          break;
        default:
          throw new Error(`Unknown queue item type: ${queueItem.type}`);
      }
      
      // Log successful processing
      await logPriorityEvent({
        itemId: queueItem.id,
        eventType: 'SYNC_COMPLETED',
        details: `Successfully synced ${queueItem.type}`,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      // Log sync failure
      await logPriorityEvent({
        itemId: queueItem.id,
        eventType: 'SYNC_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      
      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
    // Worker settings for priority processing
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 1, // Maximum times a job can be stalled
  }
);

// Helper functions for processing different item types
async function processAssessmentSync(item: PriorityQueueItem) {
  // Implementation for syncing assessment data
  // This would typically involve API calls to external systems
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
  return { success: true, syncedAt: new Date() };
}

async function processResponseSync(item: PriorityQueueItem) {
  // Implementation for syncing response data
  await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing
  return { success: true, syncedAt: new Date() };
}

async function processMediaSync(item: PriorityQueueItem) {
  // Implementation for syncing media files
  await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate processing
  return { success: true, syncedAt: new Date() };
}

async function logPriorityEvent(event: any) {
  // Implementation for logging priority events
  console.log('Priority Event:', event);
}

// Method to add jobs with priority
export async function addPriorityJob(item: PriorityQueueItem): Promise<void> {
  const priorityScore = item.priorityScore || 50;
  
  // BullMQ priority: lower number = higher priority
  // Convert our 0-100 scale (100 = highest) to BullMQ scale (0 = highest)
  const bullmqPriority = 100 - priorityScore;
  
  await syncQueue.add('sync-item', item, {
    priority: bullmqPriority,
    jobId: item.id, // Ensure idempotency
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,
    }
  });
}

// Method to get priority queue statistics
export async function getPriorityQueueStats() {
  const waiting = await syncQueue.getWaiting();
  const active = await syncQueue.getActive();
  const completed = await syncQueue.getCompleted();
  const failed = await syncQueue.getFailed();
  
  // Get counts per priority level
  const priorityCounts = await syncQueue.getCountsPerPriority([0, 30, 70]);
  
  return {
    totalItems: waiting.length + active.length,
    highPriorityItems: priorityCounts['0'] || 0,
    normalPriorityItems: priorityCounts['30'] || 0,
    lowPriorityItems: priorityCounts['70'] || 0,
    averageWaitTime: calculateAverageWaitTime(waiting),
    syncThroughput: {
      itemsPerMinute: 2.5,
      successRate: completed.length / (completed.length + failed.length) || 1
    }
  };
}

function calculateAverageWaitTime(jobs: Job[]): number {
  if (jobs.length === 0) return 0;
  
  const now = Date.now();
  const totalWaitTime = jobs.reduce((sum, job) => {
    return sum + (now - job.timestamp);
  }, 0);
  
  return Math.round(totalWaitTime / jobs.length / (1000 * 60)); // Convert to minutes
}

// Event handlers
syncWorker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

syncWorker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed with error:`, error.message);
});

syncWorker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress:`, progress);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await syncWorker.close();
  await connection.disconnect();
  process.exit(0);
});