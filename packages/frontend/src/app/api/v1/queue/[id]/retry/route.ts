import { NextRequest, NextResponse } from 'next/server';

// PUT /api/v1/queue/:id/retry - Queue API has been moved to client-side
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'Queue API has been moved to client-side',
      message: 'This API endpoint is no longer available. Queue functionality now uses IndexedDB directly from the client via the OfflineQueueService and related hooks.',
      redirectTo: 'Use useQueueData hook or OfflineQueueService.retryQueueItem() directly in client components',
    },
    { status: 410 } // Gone
  );
}

// DELETE /api/v1/queue/:id - Queue API has been moved to client-side
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'Queue API has been moved to client-side',
      message: 'This API endpoint is no longer available. Queue functionality now uses IndexedDB directly from the client via the OfflineQueueService and related hooks.',
      redirectTo: 'Use useQueueData hook or OfflineQueueService.removeQueueItem() directly in client components',
    },
    { status: 410 } // Gone
  );
}