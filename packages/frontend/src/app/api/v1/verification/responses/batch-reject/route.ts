import { NextRequest, NextResponse } from 'next/server';
import { 
  BatchResponseRejectionRequest, 
  BatchResponseRejectionResponse,
  RapidResponse,
  Feedback 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest
): Promise<NextResponse<BatchResponseRejectionResponse>> {
  try {
    const body: BatchResponseRejectionRequest = await request.json();
    
    // Validate request body
    if (!body.responseIds || !Array.isArray(body.responseIds) || body.responseIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Response IDs are required',
        error: 'responseIds must be a non-empty array',
      } as any, { status: 400 });
    }

    if (!body.coordinatorId || !body.coordinatorName || !body.rejectionComments?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Required rejection information is missing',
        error: 'coordinatorId, coordinatorName, and rejectionComments are required',
      } as any, { status: 400 });
    }

    // Validate rejection reason
    const validRejectionReasons = ['DATA_QUALITY', 'MISSING_INFO', 'VALIDATION_ERROR', 'INSUFFICIENT_EVIDENCE', 'OTHER'];
    if (!validRejectionReasons.includes(body.rejectionReason)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid rejection reason',
        error: `rejectionReason must be one of: ${validRejectionReasons.join(', ')}`,
      } as any, { status: 400 });
    }

    // Validate priority level
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid priority level',
        error: `priority must be one of: ${validPriorities.join(', ')}`,
      } as any, { status: 400 });
    }

    // Limit batch size for performance
    const maxBatchSize = 50; // Smaller for rejections due to feedback creation overhead
    if (body.responseIds.length > maxBatchSize) {
      return NextResponse.json({
        success: false,
        message: `Batch size too large. Maximum ${maxBatchSize} responses allowed for batch rejection.`,
        error: `Maximum batch size is ${maxBatchSize} responses for batch rejection`,
      } as any, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role

    const rejectionTimestamp = new Date();
    const results: { responseId: string; status: 'SUCCESS' | 'FAILED'; error?: string }[] = [];
    const feedbackIds: string[] = [];
    let rejected = 0;
    let failed = 0;
    let notificationsSent = 0;

    // Process each response
    for (const responseId of body.responseIds) {
      try {
        // Mock: Check if response exists and is in PENDING status
        const mockResponse: Partial<RapidResponse> = {
          id: responseId,
          verificationStatus: 'PENDING' as any,
          responderId: 'mock-responder-id',
          responderName: 'Mock Responder',
          responseType: 'HEALTH' as any,
        };

        if (!mockResponse) {
          results.push({
            responseId,
            status: 'FAILED',
            error: 'Response not found',
          });
          failed++;
          continue;
        }

        if (mockResponse.verificationStatus !== 'PENDING') {
          results.push({
            responseId,
            status: 'FAILED',
            error: 'Response not in pending status',
          });
          failed++;
          continue;
        }

        // Create rejection feedback
        const rejectionFeedback: Partial<Feedback> = {
          id: `feedback-${responseId}-${Date.now()}`,
          targetType: 'RESPONSE',
          targetId: responseId,
          coordinatorId: body.coordinatorId,
          coordinatorName: body.coordinatorName,
          feedbackType: 'REJECTION',
          reason: body.rejectionReason,
          comments: body.rejectionComments.trim(),
          priority: body.priority,
          requiresResponse: true, // Batch rejections typically require response
          createdAt: rejectionTimestamp,
          isRead: false,
          isResolved: false,
        };

        const feedbackId = rejectionFeedback.id!;
        feedbackIds.push(feedbackId);

        // Mock: Save feedback to database
        // TODO: Implement database operations

        // Mock: Update response in database
        // TODO: Implement database update
        // await updateResponseVerificationStatus(responseId, 'REJECTED', body.coordinatorId);

        // Mock: Send notification to responder if requested
        if (body.notifyResponders) {
          // TODO: Implement notification service
          // await sendNotificationToResponder(responseId, rejectionFeedback);
          notificationsSent++;
        }

        results.push({
          responseId,
          status: 'SUCCESS',
        });
        rejected++;

        // Log rejection action for audit trail
        console.log(`Response ${responseId} rejected in batch by ${body.coordinatorName} at ${rejectionTimestamp.toISOString()}`);
        console.log(`Batch rejection reason: ${body.rejectionReason}, Priority: ${body.priority}`);

      } catch (error) {
        console.error(`Error processing response ${responseId}:`, error);
        results.push({
          responseId,
          status: 'FAILED',
          error: 'Processing error occurred',
        });
        failed++;
      }
    }

    const response: BatchResponseRejectionResponse = {
      success: true,
      message: `Batch rejection completed. ${rejected} rejected, ${failed} failed.`,
      data: {
        processed: body.responseIds.length,
        rejected,
        failed,
        results,
        feedbackIds,
        notificationsSent,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error in batch response rejection:', error);
    
    const errorResponse = {
      success: false,
      message: 'Internal server error occurred during batch rejection',
      error: 'An unexpected error occurred. Please try again later.',
    };

    return NextResponse.json(errorResponse as any, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for batch rejection.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for batch rejection.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for batch rejection.' },
    { status: 405 }
  );
}
