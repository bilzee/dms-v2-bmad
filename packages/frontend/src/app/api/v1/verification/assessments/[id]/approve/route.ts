import { NextRequest, NextResponse } from 'next/server';
import { 
  AssessmentApprovalRequest, 
  AssessmentApprovalResponse,
  RapidAssessment,
  Feedback 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<AssessmentApprovalResponse>> {
  try {
    const assessmentId = params.id;
    
    if (!assessmentId) {
      return NextResponse.json({
        success: false,
        message: 'Assessment ID is required',
        data: null,
        errors: ['Assessment ID parameter is missing'],
      } as AssessmentApprovalResponse, { status: 400 });
    }

    const body: AssessmentApprovalRequest = await request.json();
    
    // Validate request body
    if (!body.coordinatorId || !body.coordinatorName) {
      return NextResponse.json({
        success: false,
        message: 'Coordinator information is required',
        data: null,
        errors: ['coordinatorId and coordinatorName are required'],
      } as AssessmentApprovalResponse, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role
    // For now, we'll mock the database operations

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
        errors: ['Assessment must be in PENDING status to be approved'],
      } as AssessmentApprovalResponse, { status: 404 });
    }

    // Mock: Update assessment verification status to VERIFIED
    const approvalTimestamp = new Date();
    
    // Mock: Create approval feedback if note provided
    let feedbackCreated = false;
    if (body.approvalNote?.trim()) {
      const approvalFeedback: Partial<Feedback> = {
        id: `feedback-${Date.now()}`,
        targetType: 'ASSESSMENT',
        targetId: assessmentId,
        coordinatorId: body.coordinatorId,
        coordinatorName: body.coordinatorName,
        feedbackType: 'APPROVAL_NOTE',
        reason: 'OTHER',
        comments: body.approvalNote.trim(),
        priority: 'NORMAL',
        requiresResponse: false,
        createdAt: approvalTimestamp,
        isRead: false,
        isResolved: true, // Approval notes are automatically resolved
        resolvedAt: approvalTimestamp,
      };
      
      // TODO: Save feedback to database
      feedbackCreated = true;
    }

    // Mock: Send notification to assessor if requested
    let notificationSent = false;
    if (body.notifyAssessor) {
      // TODO: Implement notification service
      // await sendNotificationToAssessor(assessmentId, approvalFeedback);
      notificationSent = true;
    }

    // Mock: Update assessment in database
    // TODO: Implement database update
    // await updateAssessmentVerificationStatus(assessmentId, 'VERIFIED', body.coordinatorId);

    // Mock: Log approval action for audit trail
    // TODO: Implement audit logging
    console.log(`Assessment ${assessmentId} approved by ${body.coordinatorName} at ${approvalTimestamp.toISOString()}`);

    const response: AssessmentApprovalResponse = {
      success: true,
      message: 'Assessment approved successfully',
      data: {
        assessmentId,
        verificationStatus: 'VERIFIED',
        approvedBy: body.coordinatorName,
        approvedAt: approvalTimestamp,
        notificationSent,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error approving assessment:', error);
    
    const errorResponse: AssessmentApprovalResponse = {
      success: false,
      message: 'Internal server error occurred while approving assessment',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to approve assessments.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to approve assessments.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to approve assessments.' },
    { status: 405 }
  );
}
