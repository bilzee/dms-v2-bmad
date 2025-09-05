import { NextRequest, NextResponse } from 'next/server';
import { VerificationStatus, SyncStatus, type RapidAssessment } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface ResubmitRequest {
  resubmissionNotes: string;
  acknowledgedFeedback: boolean;
}

interface ResubmitResponse {
  success: boolean;
  message: string;
  assessment?: Partial<RapidAssessment>;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const assessmentId = params.id;

    if (!assessmentId) {
      return NextResponse.json(
        { error: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    const body: ResubmitRequest = await request.json();
    const { resubmissionNotes, acknowledgedFeedback } = body;

    // Validate request body
    if (!resubmissionNotes || resubmissionNotes.trim().length < 10) {
      return NextResponse.json(
        { error: 'Resubmission notes must be at least 10 characters long' },
        { status: 400 }
      );
    }

    if (!acknowledgedFeedback) {
      return NextResponse.json(
        { error: 'You must acknowledge that you have addressed the feedback' },
        { status: 400 }
      );
    }

    if (resubmissionNotes.length > 500) {
      return NextResponse.json(
        { error: 'Resubmission notes must be less than 500 characters' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Check if the assessment exists and belongs to the current user
    // 2. Verify that the assessment is in REJECTED status
    // 3. Update the assessment with new verification status (PENDING)
    // 4. Add resubmission notes to the assessment history
    // 5. Notify coordinators of the resubmission
    // 6. Update sync status if needed

    // For now, simulate the database operation
    console.log(`Resubmitting assessment ${assessmentId} with notes: ${resubmissionNotes}`);

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock the updated assessment data
    const updatedAssessment: Partial<RapidAssessment> = {
      id: assessmentId,
      verificationStatus: VerificationStatus.PENDING,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    };

    const response: ResubmitResponse = {
      success: true,
      message: 'Assessment has been resubmitted successfully and is now pending review.',
      assessment: updatedAssessment,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error resubmitting assessment:', error);
    
    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to resubmit assessment. Please try again.' },
      { status: 500 }
    );
  }
}

// Handle unauthorized resubmission attempts
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Use PUT method for resubmission' },
    { status: 405 }
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}