import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock sync statistics data for development
const generateMockSyncStats = () => {
  const totalSyncRequests = Math.floor(Math.random() * 1000) + 500;
  const successfulSyncs = Math.floor(totalSyncRequests * (0.85 + Math.random() * 0.10)); // 85-95% success rate
  const failedSyncs = totalSyncRequests - successfulSyncs;
  const conflictCount = Math.floor(failedSyncs * 0.3); // 30% of failures are conflicts
  
  return {
    totalSyncRequests,
    successfulSyncs,
    failedSyncs,
    conflictCount,
    averageProcessingTime: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
    queueSize: Math.floor(Math.random() * 50) + 10,
    priorityBreakdown: {
      high: Math.floor(Math.random() * 20) + 5,
      normal: Math.floor(Math.random() * 100) + 50,
      low: Math.floor(Math.random() * 30) + 10,
    },
    errorCategorization: {
      networkErrors: Math.floor(failedSyncs * 0.4),
      validationErrors: Math.floor(failedSyncs * 0.25),
      conflictErrors: conflictCount,
      serverErrors: Math.floor(failedSyncs * 0.1),
    },
  };
};

const mockQueueMetrics = {
  syncQueue: {
    queueName: 'sync-queue',
    waiting: Math.floor(Math.random() * 20) + 5,
    active: Math.floor(Math.random() * 10) + 1,
    completed: Math.floor(Math.random() * 500) + 200,
    failed: Math.floor(Math.random() * 50) + 10,
    delayed: Math.floor(Math.random() * 5) + 0,
    completedRate: 95.2 + Math.random() * 3, // 95-98%
    failureRate: Math.random() * 5, // 0-5%
    avgProcessingTime: Math.random() * 3000 + 1000, // 1-4 seconds
  },
  verificationQueue: {
    queueName: 'verification-queue',
    waiting: Math.floor(Math.random() * 15) + 2,
    active: Math.floor(Math.random() * 5) + 1,
    completed: Math.floor(Math.random() * 200) + 100,
    failed: Math.floor(Math.random() * 20) + 3,
    delayed: Math.floor(Math.random() * 3) + 0,
    completedRate: 92.5 + Math.random() * 5, // 92-97%
    failureRate: Math.random() * 8, // 0-8%
    avgProcessingTime: Math.random() * 2000 + 500, // 0.5-2.5 seconds
  },
  mediaQueue: {
    queueName: 'media-queue',
    waiting: Math.floor(Math.random() * 10) + 1,
    active: Math.floor(Math.random() * 3) + 0,
    completed: Math.floor(Math.random() * 100) + 50,
    failed: Math.floor(Math.random() * 10) + 1,
    delayed: Math.floor(Math.random() * 2) + 0,
    completedRate: 88.0 + Math.random() * 10, // 88-98%
    failureRate: Math.random() * 12, // 0-12%
    avgProcessingTime: Math.random() * 10000 + 2000, // 2-12 seconds
  },
};

const generateHealthStatus = (stats: any) => {
  const successRate = (stats.successfulSyncs / stats.totalSyncRequests) * 100;
  const queueBacklog = stats.queueSize;
  
  if (successRate > 95 && queueBacklog < 20) return 'HEALTHY';
  if (successRate > 85 && queueBacklog < 50) return 'DEGRADED';
  return 'CRITICAL';
};

// GET /api/v1/system/performance/sync-stats - Get sync operation statistics and health
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h'; // 1h, 6h, 24h, 7d
    const includeQueue = searchParams.get('includeQueue') === 'true';
    const includeHistory = searchParams.get('includeHistory') === 'true';

    const syncStats = generateMockSyncStats();
    const totalJobs = Object.values(mockQueueMetrics).reduce((sum, queue) => 
      sum + queue.completed + queue.failed, 0);
    const totalFailures = Object.values(mockQueueMetrics).reduce((sum, queue) => 
      sum + queue.failed, 0);

    const jobStatistics = {
      syncQueue: mockQueueMetrics.syncQueue,
      verificationQueue: mockQueueMetrics.verificationQueue,
      mediaQueue: mockQueueMetrics.mediaQueue,
      totalJobs,
      totalFailures,
      overallHealth: generateHealthStatus(syncStats) as 'HEALTHY' | 'DEGRADED' | 'CRITICAL',
    };

    // Mock historical data for trends
    const mockHistory = includeHistory ? {
      syncSuccessRate: Array.from({ length: 24 }, () => 85 + Math.random() * 15), // 85-100%
      queueSize: Array.from({ length: 24 }, () => Math.floor(Math.random() * 100) + 10),
      processingTime: Array.from({ length: 24 }, () => Math.random() * 5000 + 1000),
      conflictRate: Array.from({ length: 24 }, () => Math.random() * 10), // 0-10%
    } : undefined;

    const response = {
      success: true,
      data: {
        syncStatistics: syncStats,
        queueMetrics: includeQueue ? jobStatistics : undefined,
        performance: {
          successRate: (syncStats.successfulSyncs / syncStats.totalSyncRequests) * 100,
          failureRate: (syncStats.failedSyncs / syncStats.totalSyncRequests) * 100,
          conflictRate: (syncStats.conflictCount / syncStats.totalSyncRequests) * 100,
          averageWaitTime: Math.floor(Math.random() * 2000) + 500, // 0.5-2.5 seconds
          throughputPerHour: Math.floor(syncStats.totalSyncRequests / 24), // Assuming 24h period
        },
        healthIndicators: {
          overall: jobStatistics.overallHealth,
          syncEngine: syncStats.failedSyncs < syncStats.totalSyncRequests * 0.15 ? 'HEALTHY' : 'DEGRADED',
          queueProcessor: syncStats.queueSize < 30 ? 'HEALTHY' : 'DEGRADED',
          conflictResolution: syncStats.conflictCount < syncStats.totalSyncRequests * 0.05 ? 'HEALTHY' : 'WARNING',
        },
        trends: mockHistory,
        timeRange,
        lastUpdated: new Date(),
      },
      message: 'Sync statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch sync statistics:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch sync statistics'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}