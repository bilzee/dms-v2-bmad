import { NextRequest, NextResponse } from 'next/server';
import { backgroundSyncManager } from '@/lib/sync/BackgroundSyncManager';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Handle case where backgroundSyncManager is null (during build/SSR)
    if (!backgroundSyncManager) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Background sync service not available during build'],
      }, { status: 503 });
    }

    const body = await req.json();
    const { reason = 'manual_trigger' } = body;

    // Check if sync is already running
    const status = backgroundSyncManager.getStatus();
    if (status.isRunning) {
      return NextResponse.json(
        {
          success: false,
      data: null,
          errors: ['Background sync is already running'],
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
          errors: ['Current conditions are not suitable for background sync'],
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
      errors: [null],
    });

  } catch (error) {
    console.error('Background sync start error:', error);
    
    return NextResponse.json(
      {
        success: false,
      data: null,
        errors: [error instanceof Error ? error.message : 'Failed to start background sync'],
      },
      { status: 500 }
    );
  }
}