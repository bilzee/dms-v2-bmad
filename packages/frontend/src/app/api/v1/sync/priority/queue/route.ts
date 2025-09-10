import { NextRequest, NextResponse } from 'next/server';
import type { PriorityQueueItem, PriorityQueueStats } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// NOTE: Backend BullMQ imports are handled in server-side environment
// We'll call the backend service functions when available
async function getBullMQQueueData() {
  try {
    // Import backend services dynamically - only works on server
    if (typeof window === 'undefined') {
      // Use eval to prevent webpack from trying to bundle this at build time
      const modulePath = '@dms/backend/lib/queue/syncProcessor';
      const { getPriorityQueueStats, syncQueue } = await eval(`import('${modulePath}')`);
      
      const jobs = await syncQueue.getJobs(['waiting', 'active', 'prioritized'], 0, 20);
      const stats = await getPriorityQueueStats();
      
      // Convert BullMQ jobs to PriorityQueueItem format
      const queueItems: PriorityQueueItem[] = jobs.map((job: any) => ({
        id: job.data.id || job.id?.toString() || '',
        type: job.data.type || 'ASSESSMENT',
        action: job.data.action || 'CREATE',
        data: job.data.data || {},
        retryCount: job.attemptsMade || 0,
        priority: getPriorityFromScore(job.data.priorityScore),
        priorityScore: job.data.priorityScore || 50,
        priorityReason: job.data.priorityReason || 'Default priority',
        createdAt: new Date(job.timestamp),
        estimatedSyncTime: calculateEstimatedSyncTime(job),
        errors: [job.failedReason || undefined],
        lastAttempt: job.processedOn ? new Date(job.processedOn) : undefined,
      }));
      
      return { queueItems, stats };
    }
  } catch (error) {
    console.warn('BullMQ backend not available, using mock data:', error);
  }
  
  return null;
}

function getPriorityFromScore(score: number): 'HIGH' | 'NORMAL' | 'LOW' {
  if (score >= 70) return 'HIGH';
  if (score >= 20) return 'NORMAL';
  return 'LOW';
}

function calculateEstimatedSyncTime(job: any): Date {
  // Implementation for calculating estimated sync time based on queue position
  const baseTime = Date.now();
  const queuePosition = job.opts.priority || 50;
  const estimatedDelay = queuePosition * 2 * 60 * 1000; // 2 minutes per priority point
  
  return new Date(baseTime + estimatedDelay);
}

// Fallback mock data for when BullMQ backend is not available
const mockQueue: PriorityQueueItem[] = [
  {
    id: 'queue-item-1',
    type: 'ASSESSMENT',
    action: 'CREATE',
    data: { assessmentType: 'HEALTH', affectedPopulationEstimate: 500 },
    retryCount: 0,
    priority: 'HIGH',
    priorityScore: 85,
    priorityReason: 'Health emergency detected; High beneficiary count',
    createdAt: new Date('2025-08-27T10:00:00Z'),
    estimatedSyncTime: new Date(Date.now() + 5 * 60 * 1000),
  },
  {
    id: 'queue-item-2',
    type: 'RESPONSE',
    action: 'UPDATE',
    data: { responseType: 'HEALTH', plannedDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    retryCount: 0,
    priority: 'NORMAL',
    priorityScore: 45,
    priorityReason: 'Health response within 24h',
    createdAt: new Date('2025-08-27T11:00:00Z'),
    estimatedSyncTime: new Date(Date.now() + 15 * 60 * 1000),
  },
  {
    id: 'queue-item-3',
    type: 'MEDIA',
    action: 'CREATE',
    data: { fileSize: 15728640 }, // 15MB
    retryCount: 0,
    priority: 'LOW',
    priorityScore: 25,
    priorityReason: 'Large file priority',
    createdAt: new Date('2025-08-27T09:30:00Z'),
    estimatedSyncTime: new Date(Date.now() + 45 * 60 * 1000),
  },
  {
    id: 'queue-item-4',
    type: 'ASSESSMENT',
    action: 'CREATE',
    data: { assessmentType: 'SHELTER', affectedPopulationEstimate: 200 },
    retryCount: 1,
    priority: 'NORMAL',
    priorityScore: 35,
    priorityReason: 'Shelter assessment; Moderate beneficiary count',
    createdAt: new Date('2025-08-27T08:00:00Z'),
    estimatedSyncTime: new Date(Date.now() + 30 * 60 * 1000),
    error: 'Network timeout',
    lastAttempt: new Date('2025-08-27T12:00:00Z'),
  },
];

/**
 * Calculate queue statistics
 */
function calculateQueueStats(queue: PriorityQueueItem[]): PriorityQueueStats {
  const now = new Date();
  
  // Categorize items by priority score
  const highPriorityItems = queue.filter(item => (item.priorityScore || 0) >= 70).length;
  const normalPriorityItems = queue.filter(item => {
    const score = item.priorityScore || 0;
    return score >= 20 && score < 70;
  }).length;
  const lowPriorityItems = queue.filter(item => (item.priorityScore || 0) < 20).length;

  // Calculate average wait time
  const waitTimes = queue.map(item => 
    (now.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60) // Convert to minutes
  );
  const averageWaitTime = waitTimes.length > 0 
    ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length 
    : 0;

  // Find longest waiting item
  const longestWaitingItem = queue.reduce((longest, current) => {
    const currentWaitTime = (now.getTime() - new Date(current.createdAt).getTime()) / (1000 * 60);
    const longestWaitTime = (now.getTime() - new Date(longest.createdAt).getTime()) / (1000 * 60);
    return currentWaitTime > longestWaitTime ? current : longest;
  }, queue[0]);

  const longestWaitTime = longestWaitingItem 
    ? (now.getTime() - new Date(longestWaitingItem.createdAt).getTime()) / (1000 * 60)
    : 0;

  // Calculate sync throughput (simplified - in real implementation, use actual metrics)
  const syncThroughput = {
    itemsPerMinute: 2.5, // Mock value
    successRate: 0.95,   // Mock value
  };

  return {
    totalItems: queue.length,
    highPriorityItems,
    normalPriorityItems,
    lowPriorityItems,
    averageWaitTime,
    longestWaitingItem: longestWaitingItem ? {
      id: longestWaitingItem.id,
      waitTime: longestWaitTime,
      priority: longestWaitingItem.priorityScore || 0,
    } : {
      id: '',
      waitTime: 0,
      priority: 0,
    },
    syncThroughput,
  };
}

/**
 * Calculate estimated sync times for all items
 */
function calculateEstimatedSyncTimes(queue: PriorityQueueItem[]): { [itemId: string]: Date } {
  // Sort queue by priority score (highest first)
  const sortedQueue = [...queue].sort((a, b) => 
    (b.priorityScore || 0) - (a.priorityScore || 0)
  );

  const estimatedTimes: { [itemId: string]: Date } = {};
  let cumulativeTime = Date.now();
  
  // Estimate processing time based on item type and size
  sortedQueue.forEach((item, index) => {
    let processingTime = 2 * 60 * 1000; // Base 2 minutes per item
    
    // Adjust based on type
    switch (item.type) {
      case 'MEDIA':
        processingTime = 5 * 60 * 1000; // Media takes longer
        break;
      case 'ASSESSMENT':
        processingTime = 3 * 60 * 1000;
        break;
      case 'RESPONSE':
        processingTime = 2 * 60 * 1000;
        break;
    }
    
    // Adjust for retry items (they take longer due to error handling)
    if (item.retryCount > 0) {
      processingTime *= 1.5;
    }
    
    cumulativeTime += processingTime;
    estimatedTimes[item.id] = new Date(cumulativeTime);
  });

  return estimatedTimes;
}

/**
 * GET /api/v1/sync/priority/queue - Get priority queue with analytics
 */
export async function GET(request: NextRequest) {
  try {
    // In real implementation, add authentication checks
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Try to get real BullMQ queue data first
    const bullmqData = await getBullMQQueueData();
    
    let queue: PriorityQueueItem[];
    let stats: PriorityQueueStats;
    
    if (bullmqData) {
      // Use real BullMQ data if available
      queue = bullmqData.queueItems;
      stats = bullmqData.stats;
    } else {
      // Fallback to mock data
      queue = [...mockQueue].sort((a, b) => 
        (b.priorityScore || 0) - (a.priorityScore || 0)
      );
      stats = calculateQueueStats(queue);
    }

    // Calculate estimated sync times
    const estimatedSyncTimes = calculateEstimatedSyncTimes(queue);

    // Update queue items with calculated estimated sync times
    const queueWithEstimates = queue.map(item => ({
      ...item,
      estimatedSyncTime: estimatedSyncTimes[item.id],
    }));

    return NextResponse.json({
      success: true,
      data: {
        queue: queueWithEstimates,
        stats,
        estimatedSyncTimes,
      },
    });

  } catch (error) {
    console.error('Failed to get priority queue:', error);
    return NextResponse.json(
      { success: false, data: null, errors: ['Failed to get priority queue'] },
      { status: 500 }
    );
  }
}