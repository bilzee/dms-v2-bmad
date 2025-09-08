import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/queue/summary - Queue API has been moved to client-side
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      errors: ['Queue API has been moved to client-side'],
      message: 'This API endpoint is no longer available. Queue functionality now uses IndexedDB directly from the client via the OfflineQueueService and related hooks.',
      redirectTo: 'Use useQueueSummary hook or OfflineQueueService.getQueueSummary() directly in client components',
    },
    { status: 410 } // Gone
  );
}