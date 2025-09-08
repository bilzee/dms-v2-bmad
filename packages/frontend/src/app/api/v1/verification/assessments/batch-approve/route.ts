import { NextRequest, NextResponse } from 'next/server';
import { 
  BatchApprovalRequest, 
  BatchApprovalResponse,
  RapidAssessment,
  Feedback 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest
): Promise<NextResponse<BatchApprovalResponse>> {
  try {
    const body: BatchApprovalRequest = await request.json();
    
    // Validate request body
    if (!body.assessmentIds || !Array.isArray(body.assessmentIds) || body.assessmentIds.length === 0) {
      return NextResponse.json({
        success: false,
      data: null,
        message: 'Assessment IDs are required',
        data: null,
        errors: ['assessmentIds must be a non-empty array'],
      } as BatchApprovalResponse, { status: 400 });
    }

    if (!body.coordinatorId || !body.coordinatorName) {
      return NextResponse.json({
        success: false,
      data: null,
        message: 'Coordinator information is required',
        data: null,
        errors: ['coordinatorId and coordinatorName are required'],
      } as BatchApprovalResponse, { status: 400 });
    }

    // Limit batch size for performance
    const maxBatchSize = 100;
    if (body.assessmentIds.length > maxBatchSize) {
      return NextResponse.json({
        success: false,
      data: null,
        message: `Batch size too large. Maximum ${maxBatchSize} assessments allowed.`,
        data: null,
        errors: [`Maximum batch size is ${maxBatchSize} assessments`],
      } as BatchApprovalResponse, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role

    const approvalTimestamp = new Date();
    const results: { assessmentId: string; status: 'SUCCESS' | 'FAILED'; error?: string }[] = [];
    let approved = 0;
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
            errors: ['Assessment not found'],
          });
          failed++;
          continue;
        }

        if (mockAssessment.verificationStatus !== 'PENDING') {
          results.push({
            assessmentId,
            status: 'FAILED',
            errors: ['Assessment not in pending status'],
          });
          failed++;
          continue;
        }

        // Mock: Update assessment verification status to VERIFIED
        // TODO: Implement database update
        // await updateAssessmentVerificationStatus(assessmentId, 'VERIFIED', body.coordinatorId);

        // Create batch approval feedback if note provided
        if (body.batchNote?.trim()) {
          const approvalFeedback: Partial<Feedback> = {
            id: `feedback-${assessmentId}-${Date.now()}`,
            targetType: 'ASSESSMENT',
            targetId: assessmentId,
            coordinatorId: body.coordinatorId,
            coordinatorName: body.coordinatorName,
            feedbackType: 'APPROVAL_NOTE',
            reason: 'OTHER',
            comments: body.batchNote.trim(),
            priority: 'NORMAL',
            requiresResponse: false,
            createdAt: approvalTimestamp,
            isRead: false,
            isResolved: true,
            resolvedAt: approvalTimestamp,
          };
          
          // TODO: Save feedback to database
        }

        // Mock: Send notification to assessor if requested
        if (body.notifyAssessors) {
          // TODO: Implement notification service
          // await sendBatchApprovalNotificationToAssessor(assessmentId, approvalFeedback);
          notificationsSent++;
        }

        results.push({
          assessmentId,
          status: 'SUCCESS',
        });
        approved++;

        // Log approval action
        console.log(`Batch approval: Assessment ${assessmentId} approved by ${body.coordinatorName}`);

      } catch (error) {
        console.error(`Failed to approve assessment ${assessmentId}:`, error);
        results.push({
          assessmentId,
          status: 'FAILED',
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
        failed++;
      }
    }

    // Mock: Log batch operation for audit trail
    console.log(`Batch approval completed by ${body.coordinatorName} at ${approvalTimestamp.toISOString()}`);
    console.log(`Total: ${body.assessmentIds.length}, Approved: ${approved}, Failed: ${failed}`);

    const response: BatchApprovalResponse = {
      success: true,
      message: `Batch approval completed. ${approved} approved, ${failed} failed.`,
      data: {
        processed: body.assessmentIds.length,
        approved,
        failed,
        results,
        notificationsSent,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error in batch approval:', error);
    
    const errorResponse: BatchApprovalResponse = {
      success: false,
      data: null,
      message: 'Internal server error occurred during batch approval',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST for batch approvals.'] },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST for batch approvals.'] },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST for batch approvals.'] },
    { status: 405 }
  );
}
