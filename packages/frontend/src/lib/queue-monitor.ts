// lib/queue-monitor.ts

import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

/**
 * Queue Monitor Service
 * Integrates with BullMQ to provide real-time queue metrics
 */
export class QueueMonitorService {
  private static instance: QueueMonitorService;
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private metrics: Map<string, any> = new Map();

  constructor() {
    // Initialize Redis connection
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    });

    this.initializeQueues();
  }

  static getInstance(): QueueMonitorService {
    if (!QueueMonitorService.instance) {
      QueueMonitorService.instance = new QueueMonitorService();
    }
    return QueueMonitorService.instance;
  }

  /**
   * Initialize BullMQ queues for monitoring
   */
  private initializeQueues(): void {
    const queueNames = [
      'sync-queue',
      'notification-queue',
      'export-queue',
      'verification-queue'
    ];

    queueNames.forEach(queueName => {
      try {
        // Create queue instance
        const queue = new Queue(queueName, {
          connection: this.redis,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          }
        });

        // Create queue events listener
        const queueEvents = new QueueEvents(queueName, {
          connection: this.redis
        });

        // Set up event listeners for metrics collection
        this.setupQueueEventListeners(queueName, queueEvents);

        this.queues.set(queueName, queue);
        this.queueEvents.set(queueName, queueEvents);

        console.log(`Queue monitor initialized for: ${queueName}`);
      } catch (error) {
        console.error(`Failed to initialize queue ${queueName}:`, error);
      }
    });
  }

  /**
   * Set up event listeners for queue metrics collection
   */
  private setupQueueEventListeners(queueName: string, queueEvents: QueueEvents): void {
    // Track job completions
    queueEvents.on('completed', ({ jobId }) => {
      this.updateMetrics(queueName, 'completed', jobId);
    });

    // Track job failures
    queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.updateMetrics(queueName, 'failed', jobId, failedReason);
    });

    // Track job progress
    queueEvents.on('progress', ({ jobId, data }) => {
      this.updateMetrics(queueName, 'progress', jobId, data);
    });

    // Track when jobs are waiting
    queueEvents.on('waiting', ({ jobId }) => {
      this.updateMetrics(queueName, 'waiting', jobId);
    });

    // Track when jobs become active
    queueEvents.on('active', ({ jobId }) => {
      this.updateMetrics(queueName, 'active', jobId);
    });
  }

  /**
   * Update internal metrics based on queue events
   */
  private updateMetrics(queueName: string, eventType: string, jobId: string, data?: any): void {
    const timestamp = Date.now();
    
    if (!this.metrics.has(queueName)) {
      this.metrics.set(queueName, {
        events: [],
        jobTimings: new Map(),
        stats: {
          totalCompleted: 0,
          totalFailed: 0,
          avgProcessingTime: 0,
          recentErrors: []
        }
      });
    }

    const queueMetrics = this.metrics.get(queueName);
    
    // Record event
    queueMetrics.events.push({
      type: eventType,
      jobId,
      timestamp,
      data
    });

    // Track job timings for processing time calculation
    if (eventType === 'active') {
      queueMetrics.jobTimings.set(jobId, { startTime: timestamp });
    } else if (eventType === 'completed') {
      const jobTiming = queueMetrics.jobTimings.get(jobId);
      if (jobTiming) {
        const processingTime = timestamp - jobTiming.startTime;
        jobTiming.processingTime = processingTime;
        queueMetrics.stats.totalCompleted++;
        
        // Update average processing time
        this.updateAverageProcessingTime(queueName, processingTime);
      }
      queueMetrics.jobTimings.delete(jobId);
    } else if (eventType === 'failed') {
      queueMetrics.stats.totalFailed++;
      queueMetrics.stats.recentErrors.push({
        jobId,
        timestamp,
        error: data
      });
      
      // Keep only recent errors (last 100)
      if (queueMetrics.stats.recentErrors.length > 100) {
        queueMetrics.stats.recentErrors = queueMetrics.stats.recentErrors.slice(-100);
      }
      
      queueMetrics.jobTimings.delete(jobId);
    }

    // Keep events array manageable (last 1000 events)
    if (queueMetrics.events.length > 1000) {
      queueMetrics.events = queueMetrics.events.slice(-1000);
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(queueName: string, newProcessingTime: number): void {
    const queueMetrics = this.metrics.get(queueName);
    if (!queueMetrics) return;

    const currentAvg = queueMetrics.stats.avgProcessingTime;
    const totalCompleted = queueMetrics.stats.totalCompleted;
    
    // Calculate new average
    queueMetrics.stats.avgProcessingTime = 
      ((currentAvg * (totalCompleted - 1)) + newProcessingTime) / totalCompleted;
  }

  /**
   * Get comprehensive queue metrics
   */
  async getQueueMetrics(): Promise<{
    activeJobs: number;
    waitingJobs: number;
    completedJobs: number;
    failedJobs: number;
    delayedJobs: number;
    processingRate: number;
    avgJobDuration: number;
    errorRate: number;
  }> {
    try {
      let totalActive = 0;
      let totalWaiting = 0;
      let totalCompleted = 0;
      let totalFailed = 0;
      let totalDelayed = 0;
      let totalProcessingTime = 0;
      let totalProcessedJobs = 0;

      // Aggregate metrics from all queues
      for (const [queueName, queue] of this.queues) {
        try {
          const jobCounts = await queue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed');
          
          totalActive += jobCounts.active || 0;
          totalWaiting += jobCounts.waiting || 0;
          totalCompleted += jobCounts.completed || 0;
          totalFailed += jobCounts.failed || 0;
          totalDelayed += jobCounts.delayed || 0;

          // Get processing time from internal metrics
          const queueMetrics = this.metrics.get(queueName);
          if (queueMetrics) {
            totalProcessingTime += queueMetrics.stats.avgProcessingTime * queueMetrics.stats.totalCompleted;
            totalProcessedJobs += queueMetrics.stats.totalCompleted;
          }
        } catch (error) {
          console.error(`Failed to get metrics for queue ${queueName}:`, error);
        }
      }

      // Calculate processing rate (jobs per minute from last hour)
      const processingRate = await this.calculateProcessingRate();
      
      // Calculate average job duration
      const avgJobDuration = totalProcessedJobs > 0 ? totalProcessingTime / totalProcessedJobs : 0;
      
      // Calculate error rate
      const totalJobs = totalCompleted + totalFailed;
      const errorRate = totalJobs > 0 ? (totalFailed / totalJobs) * 100 : 0;

      return {
        activeJobs: totalActive,
        waitingJobs: totalWaiting,
        completedJobs: totalCompleted,
        failedJobs: totalFailed,
        delayedJobs: totalDelayed,
        processingRate,
        avgJobDuration,
        errorRate
      };
    } catch (error) {
      console.error('Failed to get queue metrics:', error);
      return {
        activeJobs: 0,
        waitingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        delayedJobs: 0,
        processingRate: 0,
        avgJobDuration: 0,
        errorRate: 0
      };
    }
  }

  /**
   * Calculate processing rate (jobs per minute)
   */
  private async calculateProcessingRate(): Promise<number> {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let completedInLastHour = 0;

    for (const [queueName, queueMetrics] of this.metrics) {
      const completedEvents = queueMetrics.events.filter(
        (event: any) => event.type === 'completed' && event.timestamp > oneHourAgo
      );
      completedInLastHour += completedEvents.length;
    }

    return completedInLastHour / 60; // jobs per minute
  }

  /**
   * Get detailed queue information
   */
  async getDetailedQueueInfo(): Promise<Record<string, any>> {
    const queueInfo: Record<string, any> = {};

    for (const [queueName, queue] of this.queues) {
      try {
        const jobCounts = await queue.getJobCounts();
        const queueMetrics = this.metrics.get(queueName);

        queueInfo[queueName] = {
          jobCounts,
          metrics: queueMetrics?.stats || {},
          recentEvents: queueMetrics?.events.slice(-10) || [] // Last 10 events
        };
      } catch (error) {
        console.error(`Failed to get detailed info for queue ${queueName}:`, error);
        queueInfo[queueName] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return queueInfo;
  }

  /**
   * Get Prometheus-style metrics for monitoring integration
   */
  async getPrometheusMetrics(): Promise<string> {
    try {
      const queueMetrics = await this.getQueueMetrics();
      const timestamp = Date.now();

      let metrics = '';
      metrics += `# HELP queue_jobs_active Number of active jobs\n`;
      metrics += `# TYPE queue_jobs_active gauge\n`;
      metrics += `queue_jobs_active ${queueMetrics.activeJobs} ${timestamp}\n\n`;

      metrics += `# HELP queue_jobs_waiting Number of waiting jobs\n`;
      metrics += `# TYPE queue_jobs_waiting gauge\n`;
      metrics += `queue_jobs_waiting ${queueMetrics.waitingJobs} ${timestamp}\n\n`;

      metrics += `# HELP queue_jobs_completed_total Total number of completed jobs\n`;
      metrics += `# TYPE queue_jobs_completed_total counter\n`;
      metrics += `queue_jobs_completed_total ${queueMetrics.completedJobs} ${timestamp}\n\n`;

      metrics += `# HELP queue_jobs_failed_total Total number of failed jobs\n`;
      metrics += `# TYPE queue_jobs_failed_total counter\n`;
      metrics += `queue_jobs_failed_total ${queueMetrics.failedJobs} ${timestamp}\n\n`;

      metrics += `# HELP queue_processing_rate_jobs_per_minute Current job processing rate\n`;
      metrics += `# TYPE queue_processing_rate_jobs_per_minute gauge\n`;
      metrics += `queue_processing_rate_jobs_per_minute ${queueMetrics.processingRate} ${timestamp}\n\n`;

      metrics += `# HELP queue_avg_job_duration_ms Average job duration in milliseconds\n`;
      metrics += `# TYPE queue_avg_job_duration_ms gauge\n`;
      metrics += `queue_avg_job_duration_ms ${queueMetrics.avgJobDuration} ${timestamp}\n\n`;

      metrics += `# HELP queue_error_rate_percent Error rate percentage\n`;
      metrics += `# TYPE queue_error_rate_percent gauge\n`;
      metrics += `queue_error_rate_percent ${queueMetrics.errorRate} ${timestamp}\n\n`;

      return metrics;
    } catch (error) {
      console.error('Failed to generate Prometheus metrics:', error);
      return '# Error generating metrics\n';
    }
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    try {
      // Close all queue event listeners
      for (const [queueName, queueEvents] of this.queueEvents) {
        await queueEvents.close();
      }

      // Close all queues
      for (const [queueName, queue] of this.queues) {
        await queue.close();
      }

      // Close Redis connection
      await this.redis.quit();

      console.log('Queue monitor service shut down successfully');
    } catch (error) {
      console.error('Error shutting down queue monitor:', error);
    }
  }
}

// Export singleton instance
export const queueMonitor = QueueMonitorService.getInstance();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await queueMonitor.shutdown();
});

process.on('SIGINT', async () => {
  await queueMonitor.shutdown();
});