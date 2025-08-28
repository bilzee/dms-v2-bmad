// FRONTEND API CLIENT - No BullMQ imports (moved to backend)
// This file now provides a frontend API client for interacting with the backend queue

/**
 * Interface for sync queue job data
 */
export interface SyncJobData {
  id: string;
  type: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA';
  entityId: string;
  data: any;
  priorityScore: number;
  metadata?: {
    source?: string;
    urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
    estimatedSize?: number;
    timestamp?: Date;
  };
}

/**
 * Add a sync job to the priority queue via API
 */
export const addSyncJob = async (
  jobData: SyncJobData,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await fetch('/api/v1/sync/queue/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...jobData,
        options,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to add sync job');
    }

    return result;
  } catch (error) {
    console.error('Failed to add sync job:', error);
    throw error;
  }
};

/**
 * Get priority queue statistics via API
 */
export const getSyncQueueStats = async () => {
  try {
    const response = await fetch('/api/v1/sync/priority/queue');
    
    if (!response.ok) {
      throw new Error('Failed to get queue stats');
    }
    
    const result = await response.json();
    return result.data.stats;
  } catch (error) {
    console.error('Failed to get sync queue stats:', error);
    throw error;
  }
};

/**
 * Get jobs by priority level via API
 */
export const getJobsByPriority = async (priorities: number[] = [0, 1, 5, 10]) => {
  try {
    const response = await fetch('/api/v1/sync/priority/queue');
    
    if (!response.ok) {
      throw new Error('Failed to get priority queue');
    }
    
    const result = await response.json();
    const queue = result.data.queue;
    
    // Group jobs by priority scores
    const counts: Record<string, number> = {};
    
    for (const priority of priorities) {
      if (priority === 0) {
        // Priority 0 represents highest priority items (score >= 70)
        counts['0'] = queue.filter((item: any) => (item.priorityScore || 0) >= 70).length;
      } else {
        // Map priority levels to score ranges
        let minScore = 0, maxScore = 100;
        if (priority === 1) { minScore = 50; maxScore = 69; }
        else if (priority === 5) { minScore = 20; maxScore = 49; }
        else if (priority === 10) { minScore = 0; maxScore = 19; }
        
        counts[priority.toString()] = queue.filter((item: any) => {
          const score = item.priorityScore || 0;
          return score >= minScore && score <= maxScore;
        }).length;
      }
    }
    
    return counts;
  } catch (error) {
    console.error('Failed to get jobs by priority:', error);
    throw error;
  }
};

/**
 * Override job priority manually via API
 */
export const overridePriority = async (
  jobId: string, 
  newPriority: number, 
  justification: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/v1/sync/priority/override', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId,
        newPriority,
        justification,
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error(`Failed to override priority for job ${jobId}:`, error);
    return false;
  }
};