import { NextRequest, NextResponse } from 'next/server';
import { 
  ResponseApprovalRequest, 
  ResponseApprovalResponse,
  RapidResponse,
  Feedback 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ResponseApprovalResponse>> {
  try {
    const responseId = params.id;
    
    if (!responseId) {
      return NextResponse.json({
        success: false,
        message: 'Response ID is required',
        errors: ['Response ID parameter is missing'],
      } as any, { status: 400 });
    }

    const body: ResponseApprovalRequest = await request.json();
    
    // Validate request body
    if (!body.coordinatorId || !body.coordinatorName) {
      return NextResponse.json({
        success: false,
        message: 'Coordinator information is required',
        errors: ['coordinatorId and coordinatorName are required'],
      } as any, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role
    // For now, we'll mock the database operations

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
        errors: ['Response must be in PENDING status to be approved'],
      } as any, { status: 404 });
    }

    // Mock: Update response verification status to VERIFIED
    const approvalTimestamp = new Date();
    
    // Mock: Create approval feedback if note provided
    let feedbackCreated = false;
    if (body.approvalNote?.trim()) {
      const approvalFeedback: Partial<Feedback> = {
        id: `feedback-${Date.now()}`,
        targetType: 'RESPONSE',
        targetId: responseId,
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

    // Mock: Send notification to responder if requested
    let notificationSent = false;
    if (body.notifyResponder) {
      // TODO: Implement notification service
      // await sendNotificationToResponder(responseId, approvalFeedback);
      notificationSent = true;
    }

    // Mock: Update response in database
    // TODO: Implement database update
    // await updateResponseVerificationStatus(responseId, 'VERIFIED', body.coordinatorId);

    // Generate verification stamp and trigger achievement calculation
    let achievementResults = [];
    try {
      // Import achievement engine dynamically
      const { VerificationAchievementEngine } = await import('@/lib/achievements/achievementEngine');
      
      // Calculate achievements for all linked donors
      const mockDonorId = 'mock-donor-id'; // In real implementation, get from response.donorCommitments
      const verificationId = `verification-${Date.now()}`;
      
      const achievements = await VerificationAchievementEngine.calculateAchievementsForVerifiedResponse(
        mockDonorId,
        responseId,
        verificationId
      );

      if (achievements.length > 0) {
        achievementResults.push({
          donorId: mockDonorId,
          donorName: 'Mock Donor',
          newAchievements: achievements
        });

        // Trigger browser achievement notification
        console.log(`Generated ${achievements.length} achievements for donor ${mockDonorId}`);
      }
    } catch (error) {
      console.error('Failed to calculate achievements during approval:', error);
    }

    // Mock: Log approval action for audit trail
    // TODO: Implement audit logging
    console.log(`Response ${responseId} approved by ${body.coordinatorName} at ${approvalTimestamp.toISOString()}`);

    const response: ResponseApprovalResponse = {
      success: true,
      message: `Response approved successfully${achievementResults.length > 0 ? ` and achievements calculated for ${achievementResults.length} donor(s)` : ''}`,
      data: {
        responseId,
        verificationStatus: 'VERIFIED',
        approvedBy: body.coordinatorName,
        approvedAt: approvalTimestamp,
        notificationSent,
        achievementResults,
      } as any,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error approving response:', error);
    
    const errorResponse = {
      success: false,
      message: 'Internal server error occurred while approving response',
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse as any, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST to approve responses.'] },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST to approve responses.'] },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST to approve responses.'] },
    { status: 405 }
  );
}
