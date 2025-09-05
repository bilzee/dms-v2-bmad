import { NextRequest, NextResponse } from 'next/server';
import { backgroundSyncManager } from '@/lib/sync/BackgroundSyncManager';
import type { SyncMetrics } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Handle case where backgroundSyncManager is null (during build/SSR)
    if (!backgroundSyncManager) {
      return NextResponse.json({
        success: true,
        data: {
          metrics: [],
          pagination: { limit: 10, offset: 0, total: 0 },
          averagePerformance: {
            averageDuration: 0,
            averageItemsPerSession: 0,
            successRate: 0,
            averageDataSynced: 0,
          },
          currentMetrics: null,
        },
        error: null,
      });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get sync history
    const allMetrics = backgroundSyncManager.getSyncHistory();
    
    // Apply pagination
    const paginatedMetrics = allMetrics.slice(offset, offset + limit);
    
    // Calculate average performance metrics
    const averagePerformance = calculateAveragePerformance(allMetrics);
    
    // Get current metrics if available
    const currentProgress = backgroundSyncManager.getProgress();
    let currentMetrics: Partial<SyncMetrics> | null = null;
    
    if (currentProgress) {
      currentMetrics = {
        sessionId: `current-${Date.now()}`,
        startTime: currentProgress.lastSyncAttempt,
        itemsProcessed: currentProgress.completedItems + currentProgress.failedItems,
        itemsSucceeded: currentProgress.completedItems,
        itemsFailed: currentProgress.failedItems,
        totalDataSynced: 0, // Would need to track this
        networkUsage: 0, // Would need to track this
        batteryUsed: 0, // Would need to track this
        errors: [],
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        current: currentMetrics,
        historical: paginatedMetrics,
        averagePerformance,
        pagination: {
          offset,
          limit,
          totalCount: allMetrics.length,
        },
      },
      error: null,
    });

  } catch (error) {
    console.error('Get background sync metrics error:', error);
    
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get background sync metrics',
      },
      { status: 500 }
    );
  }
}

function calculateAveragePerformance(metrics: SyncMetrics[]) {
  if (metrics.length === 0) {
    return {
      itemsPerMinute: 0,
      successRate: 0,
      averageBatteryUsage: 0,
      averageNetworkUsage: 0,
    };
  }

  const totalProcessed = metrics.reduce((sum, m) => sum + m.itemsProcessed, 0);
  const totalSucceeded = metrics.reduce((sum, m) => sum + m.itemsSucceeded, 0);
  const totalDuration = metrics.reduce((sum, m) => {
    if (m.endTime) {
      return sum + (m.endTime.getTime() - m.startTime.getTime());
    }
    return sum;
  }, 0);
  
  const totalBatteryUsage = metrics.reduce((sum, m) => sum + (m.batteryUsed || 0), 0);
  const totalNetworkUsage = metrics.reduce((sum, m) => sum + (m.networkUsage || 0), 0);

  const avgDurationMinutes = totalDuration / (1000 * 60); // Convert to minutes
  const itemsPerMinute = avgDurationMinutes > 0 ? totalProcessed / avgDurationMinutes : 0;
  const successRate = totalProcessed > 0 ? (totalSucceeded / totalProcessed) * 100 : 0;
  const averageBatteryUsage = totalBatteryUsage / metrics.length;
  const averageNetworkUsage = totalNetworkUsage / metrics.length;

  return {
    itemsPerMinute: Math.round(itemsPerMinute * 100) / 100,
    successRate: Math.round(successRate * 100) / 100,
    averageBatteryUsage: Math.round(averageBatteryUsage * 100) / 100,
    averageNetworkUsage: Math.round(averageNetworkUsage / (1024 * 1024) * 100) / 100, // Convert to MB
  };
}