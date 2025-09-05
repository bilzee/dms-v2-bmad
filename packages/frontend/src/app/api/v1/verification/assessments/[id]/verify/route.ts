import { NextRequest, NextResponse } from 'next/server';
import { VerificationStatus } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface VerifyAssessmentRequest {
  action: 'APPROVE' | 'REJECT';
  feedback?: {
    reason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
    comments: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  };
}

interface VerifyAssessmentResponse {
  success: boolean;
  data?: {
    assessmentId: string;
    oldStatus: VerificationStatus;
    newStatus: VerificationStatus;
    feedbackCreated?: boolean;
  };
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = params.id;
    
    if (!assessmentId) {
      const errorResponse: VerifyAssessmentResponse = {
        success: false,
        error: 'Assessment ID is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const body = await request.json() as VerifyAssessmentRequest;
    
    // Validate request
    if (!['APPROVE', 'REJECT'].includes(body.action)) {
      const errorResponse: VerifyAssessmentResponse = {
        success: false,
        error: 'Invalid action. Must be APPROVE or REJECT',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate feedback for rejection
    if (body.action === 'REJECT' && !body.feedback) {
      const errorResponse: VerifyAssessmentResponse = {
        success: false,
        error: 'Feedback is required for rejection',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (body.action === 'REJECT' && body.feedback && !body.feedback.comments.trim()) {
      const errorResponse: VerifyAssessmentResponse = {
        success: false,
        error: 'Comments are required for rejection feedback',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Simulate processing
    const oldStatus = VerificationStatus.PENDING;
    const newStatus = body.action === 'APPROVE' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
    
    // In a real implementation, this would:
    // 1. Fetch the current assessment from database
    // 2. Check if user has permission to verify this assessment
    // 3. Update the assessment verification status
    // 4. Create feedback record if rejecting
    // 5. Send notification to assessor
    // 6. Update audit trail
    // 7. Update any related response planning
    
    console.log(`${body.action} assessment ${assessmentId}: ${oldStatus} -> ${newStatus}`);
    
    let feedbackCreated = false;
    if (body.action === 'REJECT' && body.feedback) {
      // Create feedback record
      console.log(`Creating feedback for assessment ${assessmentId}:`, body.feedback);
      feedbackCreated = true;
    }

    const response: VerifyAssessmentResponse = {
      success: true,
      data: {
        assessmentId,
        oldStatus,
        newStatus,
        feedbackCreated,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Verify assessment API error:', error);
    
    const errorResponse: VerifyAssessmentResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}