import { NextRequest, NextResponse } from 'next/server';
import { 
  AssessmentRejectionRequest, 
  AssessmentRejectionResponse,
  RapidAssessment,
  Feedback 
} from '@dms/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<AssessmentRejectionResponse>> {
  try {
    const assessmentId = params.id;
    
    if (!assessmentId) {
      return NextResponse.json({
        success: false,
        message: 'Assessment ID is required',
        data: null,
        errors: ['Assessment ID parameter is missing'],
      } as AssessmentRejectionResponse, { status: 400 });
    }

    const body: AssessmentRejectionRequest = await request.json();
    
    // Validate request body
    if (!body.coordinatorId || !body.coordinatorName || !body.rejectionComments?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Required rejection information is missing',
        data: null,
        errors: ['coordinatorId, coordinatorName, and rejectionComments are required'],
      } as AssessmentRejectionResponse, { status: 400 });
    }

    // Validate rejection reason
    const validRejectionReasons = ['DATA_QUALITY', 'MISSING_INFO', 'VALIDATION_ERROR', 'INSUFFICIENT_EVIDENCE', 'OTHER'];
    if (!validRejectionReasons.includes(body.rejectionReason)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid rejection reason',
        data: null,
        errors: [`rejectionReason must be one of: ${validRejectionReasons.join(', ')}`],
      } as AssessmentRejectionResponse, { status: 400 });
    }

    // Validate priority level
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid priority level',
        data: null,
        errors: [`priority must be one of: ${validPriorities.join(', ')}`],
      } as AssessmentRejectionResponse, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role

    // Mock: Check if assessment exists and is in PENDING status
    const mockAssessment: Partial<RapidAssessment> = {
      id: assessmentId,
      verificationStatus: 'PENDING',
      assessorId: 'mock-assessor-id',
      assessorName: 'Mock Assessor',
    };

    if (!mockAssessment || mockAssessment.verificationStatus !== 'PENDING') {
      return NextResponse.json({
        success: false,
        message: 'Assessment not found or not in pending status',
        data: null,
        errors: ['Assessment must be in PENDING status to be rejected'],
      } as AssessmentRejectionResponse, { status: 404 });
    }

    const rejectionTimestamp = new Date();
    
    // Create rejection feedback
    const rejectionFeedback: Partial<Feedback> = {
      id: `feedback-${Date.now()}`,
      targetType: 'ASSESSMENT',
      targetId: assessmentId,
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
      resolvedAt: undefined,
    };

    // TODO: Save feedback to database
    const feedbackId = rejectionFeedback.id!;

    // Mock: Send notification to assessor if requested
    let notificationSent = false;
    if (body.notifyAssessor) {
      // TODO: Implement notification service
      // await sendRejectionNotificationToAssessor(assessmentId, rejectionFeedback);
      notificationSent = true;
    }

    // Mock: Update assessment in database
    // TODO: Implement database update
    // await updateAssessmentVerificationStatus(assessmentId, 'REJECTED', body.coordinatorId);

    // Mock: Log rejection action for audit trail
    // TODO: Implement audit logging
    console.log(`Assessment ${assessmentId} rejected by ${body.coordinatorName} at ${rejectionTimestamp.toISOString()}`);
    console.log(`Rejection reason: ${body.rejectionReason}, Priority: ${body.priority}`);
    console.log(`Feedback: ${body.rejectionComments}`);

    const response: AssessmentRejectionResponse = {
      success: true,
      message: 'Assessment rejected successfully',
      data: {
        assessmentId,
        verificationStatus: 'REJECTED',
        rejectedBy: body.coordinatorName,
        rejectedAt: rejectionTimestamp,
        feedbackId,
        notificationSent,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error rejecting assessment:', error);
    
    const errorResponse: AssessmentRejectionResponse = {
      success: false,
      message: 'Internal server error occurred while rejecting assessment',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to reject assessments.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to reject assessments.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to reject assessments.' },
    { status: 405 }
  );
}