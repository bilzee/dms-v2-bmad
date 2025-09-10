import { NextRequest, NextResponse } from 'next/server';
import { 
  ResponseRejectionRequest, 
  ResponseRejectionResponse,
  RapidResponse,
  Feedback 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ResponseRejectionResponse>> {
  try {
    const responseId = params.id;
    
    if (!responseId) {
      return NextResponse.json({
        success: false,
        message: 'Response ID is required',
        errors: ['Response ID parameter is missing'],
      } as any, { status: 400 });
    }

    const body: ResponseRejectionRequest = await request.json();
    
    // Validate request body
    if (!body.coordinatorId || !body.coordinatorName || !body.rejectionComments?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Required rejection information is missing',
        errors: ['coordinatorId, coordinatorName, and rejectionComments are required'],
      } as any, { status: 400 });
    }

    // Validate rejection reason
    const validRejectionReasons = ['DATA_QUALITY', 'MISSING_INFO', 'VALIDATION_ERROR', 'INSUFFICIENT_EVIDENCE', 'OTHER'];
    if (!validRejectionReasons.includes(body.rejectionReason)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid rejection reason',
        errors: [`rejectionReason must be one of: ${validRejectionReasons.join(', ')}`],
      } as any, { status: 400 });
    }

    // Validate priority level
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid priority level',
        errors: [`priority must be one of: ${validPriorities.join(', ')}`],
      } as any, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role

    // Mock: Check if response exists and is in PENDING status
    const mockResponse: Partial<RapidResponse> = {
      id: responseId,
      verificationStatus: 'PENDING' as any,
      responderId: 'mock-responder-id',
      responderName: 'Mock Responder',
      responseType: 'HEALTH' as any,
    };

    if (!mockResponse || mockResponse.verificationStatus !== 'PENDING') {
      return NextResponse.json({
        success: false,
        message: 'Response not found or not in pending status',
        errors: ['Response must be in PENDING status to be rejected'],
      } as any, { status: 404 });
    }

    const rejectionTimestamp = new Date();
    
    // Create rejection feedback
    const rejectionFeedback: Partial<Feedback> = {
      id: `feedback-${Date.now()}`,
      targetType: 'RESPONSE',
      targetId: responseId,
      coordinatorId: body.coordinatorId,
      coordinatorName: body.coordinatorName,
      feedbackType: 'REJECTION',
      reason: body.rejectionReason,
      comments: body.rejectionComments.trim(),
      priority: body.priority,
      requiresResponse: body.requiresResubmission,
      createdAt: rejectionTimestamp,
      isRead: false,
      isResolved: false,
    };

    // Mock: Save feedback to database
    // TODO: Implement database operations
    const feedbackId = rejectionFeedback.id!;

    // Mock: Send notification to responder if requested
    let notificationSent = false;
    if (body.notifyResponder) {
      // TODO: Implement notification service
      // await sendNotificationToResponder(responseId, rejectionFeedback);
      notificationSent = true;
    }

    // Mock: Update response in database
    // TODO: Implement database update
    // await updateResponseVerificationStatus(responseId, 'REJECTED', body.coordinatorId);

    // Mock: Log rejection action for audit trail
    // TODO: Implement audit logging
    console.log(`Response ${responseId} rejected by ${body.coordinatorName} at ${rejectionTimestamp.toISOString()}`);
    console.log(`Rejection reason: ${body.rejectionReason}, Priority: ${body.priority}`);
    console.log(`Rejection comments: ${body.rejectionComments}`);

    const response: ResponseRejectionResponse = {
      success: true,
      message: 'Response rejected successfully with feedback',
      data: {
        responseId,
        verificationStatus: 'REJECTED',
        rejectedBy: body.coordinatorName,
        rejectedAt: rejectionTimestamp,
        feedbackId,
        notificationSent,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error rejecting response:', error);
    
    const errorResponse = {
      success: false,
      message: 'Internal server error occurred while rejecting response',
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse as any, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST to reject responses.'] },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST to reject responses.'] },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST to reject responses.'] },
    { status: 405 }
  );
}
