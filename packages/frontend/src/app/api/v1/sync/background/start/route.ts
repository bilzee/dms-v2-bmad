import { NextRequest, NextResponse } from 'next/server';
import { backgroundSyncManager } from '@/lib/sync/BackgroundSyncManager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reason = 'manual_trigger' } = body;

    // Check if sync is already running
    const status = backgroundSyncManager.getStatus();
    if (status.isRunning) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Background sync is already running',
        },
        { status: 409 }
      );
    }

    // Check if conditions are suitable for sync
    if (!status.canSync) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Current conditions are not suitable for background sync',
        },
        { status: 400 }
      );
    }

    // Trigger immediate background sync
    await backgroundSyncManager.triggerImmediateSync(reason);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Background sync started successfully',
        triggeredAt: new Date().toISOString(),
        reason,
      },
      error: null,
    });

  } catch (error) {
    console.error('Background sync start error:', error);
    
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to start background sync',
      },
      { status: 500 }
    );
  }
}