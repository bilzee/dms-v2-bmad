import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/queue - Queue API has been moved to client-side
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Queue API has been moved to client-side',
      message: 'This API endpoint is no longer available. Queue functionality now uses IndexedDB directly from the client via the OfflineQueueService and related hooks.',
      redirectTo: 'Use useQueueData hook or OfflineQueueService directly in client components',
    },
    { status: 410 } // Gone
  );
}