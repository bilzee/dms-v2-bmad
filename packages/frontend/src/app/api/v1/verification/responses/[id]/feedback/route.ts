import { NextRequest, NextResponse } from 'next/server';
import { Feedback, ApiResponse } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface ResponseFeedbackHistoryResponse extends ApiResponse<{
  responseId: string;
  feedback: Feedback[];
  stats: {
    total: number;
    unread: number;
    unresolved: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
}> {}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ResponseFeedbackHistoryResponse>> {
  try {
    const responseId = params.id;
    
    if (!responseId) {
      return NextResponse.json({
        success: false,
      data: null,
        message: 'Response ID is required',
        data: null,
        errors: ['Response ID parameter is missing'],
      } as ResponseFeedbackHistoryResponse, { status: 400 });
    }

    // TODO: Add authentication middleware to verify user permissions

    // Mock: Retrieve feedback for the response
    const mockFeedback: Feedback[] = [
      {
        id: 'feedback-1',
        targetType: 'RESPONSE',
        targetId: responseId,
        coordinatorId: 'coord-1',
        coordinatorName: 'John Coordinator',
        feedbackType: 'REJECTION',
        reason: 'INSUFFICIENT_EVIDENCE',
        comments: 'The delivery documentation lacks sufficient evidence. Please provide photos of the beneficiaries receiving the items and obtain signed receipts.',
        priority: 'HIGH',
        requiresResponse: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        isRead: true,
        isResolved: false,
        resolvedAt: undefined,
      },
      {
        id: 'feedback-2',
        targetType: 'RESPONSE',
        targetId: responseId,
        coordinatorId: 'coord-2',
        coordinatorName: 'Sarah Manager',
        feedbackType: 'CLARIFICATION_REQUEST',
        reason: 'MISSING_INFO',
        comments: 'Could you clarify the partial delivery quantities? The reported delivered amount seems to exceed the planned quantity for some items.',
        priority: 'NORMAL',
        requiresResponse: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        isRead: false,
        isResolved: false,
        resolvedAt: undefined,
      },
      {
        id: 'feedback-3',
        targetType: 'RESPONSE',
        targetId: responseId,
        coordinatorId: 'coord-1',
        coordinatorName: 'John Coordinator',
        feedbackType: 'APPROVAL_NOTE',
        reason: 'OTHER',
        comments: 'Excellent delivery documentation and beneficiary verification. Well done on maintaining quality standards.',
        priority: 'NORMAL',
        requiresResponse: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        isRead: false,
        isResolved: true,
        resolvedAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    ];

    // Calculate feedback statistics
    const stats = mockFeedback.reduce((acc, feedback) => {
      acc.total++;
      if (!feedback.isRead) acc.unread++;
      if (!feedback.isResolved) acc.unresolved++;
      
      acc.byType[feedback.feedbackType] = (acc.byType[feedback.feedbackType] || 0) + 1;
      acc.byPriority[feedback.priority] = (acc.byPriority[feedback.priority] || 0) + 1;
      
      return acc;
    }, {
      total: 0,
      unread: 0,
      unresolved: 0,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    });

    const response: ResponseFeedbackHistoryResponse = {
      success: true,
      message: 'Response feedback history retrieved successfully',
      data: {
        responseId,
        feedback: mockFeedback,
        stats,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error retrieving response feedback history:', error);
    
    const errorResponse: ResponseFeedbackHistoryResponse = {
      success: false,
      data: null,
      message: 'Internal server error occurred while retrieving response feedback',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use GET to retrieve response feedback history.'] },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use GET to retrieve response feedback history.'] },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use GET to retrieve response feedback history.'] },
    { status: 405 }
  );
}