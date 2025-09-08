import { NextRequest, NextResponse } from 'next/server';
import { backgroundSyncManager } from '@/lib/sync/BackgroundSyncManager';
import { connectivityDetector } from '@/lib/sync/ConnectivityDetector';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Handle case where backgroundSyncManager is null (during build/SSR)
    if (!backgroundSyncManager) {
      return NextResponse.json({
        success: true,
        data: {
          isActive: false,
          currentProgress: null,
          connectivity: { isOnline: true, connectionQuality: 'good' as const },
          queueSize: 0,
          estimatedCompletionTime: null,
          lastError: 'Service not available during build',
        },
        errors: [null],
      });
    }

    const syncStatus = backgroundSyncManager.getStatus();
    const connectivityStatus = connectivityDetector.getStatus();
    const progress = backgroundSyncManager.getProgress();
    
    // Calculate queue size from sync store (this would typically come from a database)
    const queueSize = progress?.totalItems || 0;
    
    // Calculate estimated completion time
    let estimatedCompletionTime: Date | undefined;
    if (progress && progress.currentOperation?.estimatedTimeRemaining) {
      const remainingItems = progress.totalItems - progress.completedItems;
      const avgTimePerItem = progress.averageSyncDuration;
      const totalRemainingSeconds = remainingItems * avgTimePerItem;
      estimatedCompletionTime = new Date(Date.now() + (totalRemainingSeconds * 1000));
    }

    const response = {
      success: true,
      data: {
        isActive: syncStatus.isRunning && !syncStatus.isPaused,
        currentProgress: progress,
        connectivity: connectivityStatus,
        queueSize,
        estimatedCompletionTime,
        lastError: null, // Would come from error tracking
      },
      errors: [null],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Background sync status error:', error);
    
    return NextResponse.json(
      {
        success: false,
      data: null,
        errors: [error instanceof Error ? error.message : 'Failed to get background sync status'],
      },
      { status: 500 }
    );
  }
}