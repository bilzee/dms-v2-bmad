import { NextRequest, NextResponse } from 'next/server';
import { 
  BatchRejectionRequest, 
  BatchRejectionResponse,
  RapidAssessment,
  Feedback 
} from '@dms/shared';

export async function POST(
  request: NextRequest
): Promise<NextResponse<BatchRejectionResponse>> {
  try {
    const body: BatchRejectionRequest = await request.json();
    
    // Validate request body
    if (!body.assessmentIds || !Array.isArray(body.assessmentIds) || body.assessmentIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Assessment IDs are required',
        data: null,
        errors: ['assessmentIds must be a non-empty array'],
      } as BatchRejectionResponse, { status: 400 });
    }

    if (!body.coordinatorId || !body.coordinatorName || !body.rejectionComments?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Required rejection information is missing',
        data: null,
        errors: ['coordinatorId, coordinatorName, and rejectionComments are required'],
      } as BatchRejectionResponse, { status: 400 });
    }

    // Validate rejection reason
    const validRejectionReasons = ['DATA_QUALITY', 'MISSING_INFO', 'VALIDATION_ERROR', 'INSUFFICIENT_EVIDENCE', 'OTHER'];
    if (!validRejectionReasons.includes(body.rejectionReason)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid rejection reason',
        data: null,
        errors: [`rejectionReason must be one of: ${validRejectionReasons.join(', ')}`],
      } as BatchRejectionResponse, { status: 400 });
    }

    // Validate priority level
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid priority level',
        data: null,
        errors: [`priority must be one of: ${validPriorities.join(', ')}`],
      } as BatchRejectionResponse, { status: 400 });
    }

    // Limit batch size for performance
    const maxBatchSize = 100;
    if (body.assessmentIds.length > maxBatchSize) {
      return NextResponse.json({
        success: false,
        message: `Batch size too large. Maximum ${maxBatchSize} assessments allowed.`,
        data: null,
        errors: [`Maximum batch size is ${maxBatchSize} assessments`],
      } as BatchRejectionResponse, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role

    const rejectionTimestamp = new Date();
    const results: { assessmentId: string; status: 'SUCCESS' | 'FAILED'; error?: string }[] = [];
    const feedbackIds: string[] = [];
    let rejected = 0;
    let failed = 0;
    let notificationsSent = 0;

    // Process each assessment
    for (const assessmentId of body.assessmentIds) {
      try {
        // Mock: Check if assessment exists and is in PENDING status
        const mockAssessment: Partial<RapidAssessment> = {
          id: assessmentId,
          verificationStatus: 'PENDING',
          assessorId: 'mock-assessor-id',
          assessorName: 'Mock Assessor',
        };

        if (!mockAssessment) {
          results.push({
            assessmentId,
            status: 'FAILED',
            error: 'Assessment not found',
          });
          failed++;
          continue;
        }

        if (mockAssessment.verificationStatus !== 'PENDING') {
          results.push({
            assessmentId,
            status: 'FAILED',
            error: 'Assessment not in pending status',
          });
          failed++;
          continue;
        }

        // Create rejection feedback
        const feedbackId = `feedback-${assessmentId}-${Date.now()}`;
        const rejectionFeedback: Partial<Feedback> = {
          id: feedbackId,
          targetType: 'ASSESSMENT',
          targetId: assessmentId,
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
          resolvedAt: undefined,
        };

        // TODO: Save feedback to database
        feedbackIds.push(feedbackId);

        // Mock: Update assessment verification status to REJECTED
        // TODO: Implement database update
        // await updateAssessmentVerificationStatus(assessmentId, 'REJECTED', body.coordinatorId);

        // Mock: Send notification to assessor if requested
        if (body.notifyAssessors) {
          // TODO: Implement notification service
          // await sendBatchRejectionNotificationToAssessor(assessmentId, rejectionFeedback);
          notificationsSent++;
        }

        results.push({
          assessmentId,
          status: 'SUCCESS',
        });
        rejected++;

        // Log rejection action
        console.log(`Batch rejection: Assessment ${assessmentId} rejected by ${body.coordinatorName}`);

      } catch (error) {
        console.error(`Failed to reject assessment ${assessmentId}:`, error);
        results.push({
          assessmentId,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    // Mock: Log batch operation for audit trail
    console.log(`Batch rejection completed by ${body.coordinatorName} at ${rejectionTimestamp.toISOString()}`);
    console.log(`Reason: ${body.rejectionReason}, Priority: ${body.priority}`);
    console.log(`Total: ${body.assessmentIds.length}, Rejected: ${rejected}, Failed: ${failed}`);
    console.log(`Feedback: ${body.rejectionComments}`);

    const response: BatchRejectionResponse = {
      success: true,
      message: `Batch rejection completed. ${rejected} rejected, ${failed} failed.`,
      data: {
        processed: body.assessmentIds.length,
        rejected,
        failed,
        results,
        feedbackIds,
        notificationsSent,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error in batch rejection:', error);
    
    const errorResponse: BatchRejectionResponse = {
      success: false,
      message: 'Internal server error occurred during batch rejection',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for batch rejections.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for batch rejections.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for batch rejections.' },
    { status: 405 }
  );
}