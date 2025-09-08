import { NextRequest, NextResponse } from 'next/server';
import { Feedback, ApiResponse } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface FeedbackHistoryResponse extends ApiResponse<{
  assessmentId: string;
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
): Promise<NextResponse<FeedbackHistoryResponse>> {
  try {
    const assessmentId = params.id;
    
    if (!assessmentId) {
      return NextResponse.json({
        success: false,
      data: null,
        message: 'Assessment ID is required',
        data: null,
        errors: ['Assessment ID parameter is missing'],
      } as FeedbackHistoryResponse, { status: 400 });
    }

    // TODO: Add authentication middleware to verify user permissions

    // Mock: Retrieve feedback for the assessment
    const mockFeedback: Feedback[] = [
      {
        id: 'feedback-1',
        targetType: 'ASSESSMENT',
        targetId: assessmentId,
        coordinatorId: 'coord-1',
        coordinatorName: 'John Coordinator',
        feedbackType: 'REJECTION',
        reason: 'DATA_QUALITY',
        comments: 'Please review the population data as the numbers seem inconsistent with the reported households.',
        priority: 'HIGH',
        requiresResponse: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        isRead: true,
        isResolved: false,
        resolvedAt: undefined,
      },
      {
        id: 'feedback-2',
        targetType: 'ASSESSMENT',
        targetId: assessmentId,
        coordinatorId: 'coord-2',
        coordinatorName: 'Jane Manager',
        feedbackType: 'CLARIFICATION_REQUEST',
        reason: 'MISSING_INFO',
        comments: 'Could you provide more details about the water source accessibility?',
        priority: 'NORMAL',
        requiresResponse: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        isRead: false,
        isResolved: false,
        resolvedAt: undefined,
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

    const response: FeedbackHistoryResponse = {
      success: true,
      message: 'Feedback history retrieved successfully',
      data: {
        assessmentId,
        feedback: mockFeedback,
        stats,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error retrieving feedback history:', error);
    
    const errorResponse: FeedbackHistoryResponse = {
      success: false,
      data: null,
      message: 'Internal server error occurred while retrieving feedback',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use GET to retrieve feedback history.'] },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use GET to retrieve feedback history.'] },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use GET to retrieve feedback history.'] },
    { status: 405 }
  );
}