import { NextRequest, NextResponse } from 'next/server';
import { type CoordinatorFeedback } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock feedback data - replace with actual database queries
const generateMockFeedback = (assessmentId: string): CoordinatorFeedback[] => {
  const now = new Date();
  
  // Only return feedback for rejected assessments (in real implementation, check assessment status)
  if (assessmentId === 'assessment-1') {
    return [
      {
        id: 'feedback-1',
        assessmentId,
        coordinatorId: 'coord-123',
        coordinatorName: 'Sarah Johnson',
        reason: 'DATA_QUALITY',
        comments: 'The population count seems inconsistent with the household count. Please verify the numbers and ensure they align with standard ratios. The reported 5 health workers for 2 facilities seems unusually high.',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        isRead: false,
      },
      {
        id: 'feedback-2',
        assessmentId,
        coordinatorId: 'coord-456',
        coordinatorName: 'Michael Chen',
        reason: 'MISSING_INFO',
        comments: 'GPS coordinates are missing for this assessment. Please ensure location data is captured for accurate mapping. Also, the medical supplies section needs more specific details about what supplies are available.',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        isRead: false,
      },
      {
        id: 'feedback-3',
        assessmentId,
        coordinatorId: 'coord-789',
        coordinatorName: 'Dr. Emily Davis',
        reason: 'VALIDATION_ERROR',
        comments: 'The assessment indicates no medicine supply but also states that medical supplies are available. This is contradictory. Please clarify and provide accurate information.',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
        isRead: false,
      }
    ];
  }

  // Return empty array for assessments with no feedback
  return [];
};

interface FeedbackResponse {
  data: CoordinatorFeedback[];
  meta: {
    totalCount: number;
    unreadCount: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const assessmentId = params.id;

    if (!assessmentId) {
      return NextResponse.json(
        { errors: ['Assessment ID is required'] },
        { status: 400 }
      );
    }

    // Get feedback for the assessment
    const feedbackList = generateMockFeedback(assessmentId);

    // Calculate counts
    const totalCount = feedbackList.length;
    const unreadCount = feedbackList.filter(f => !f.isRead).length;

    const response: FeedbackResponse = {
      data: feedbackList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      meta: {
        totalCount,
        unreadCount,
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { errors: ['Failed to fetch feedback'] },
      { status: 500 }
    );
  }
}

// Mark feedback as read
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const assessmentId = params.id;
    const body = await request.json();
    const { feedbackId, markAllAsRead } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { errors: ['Assessment ID is required'] },
        { status: 400 }
      );
    }

    // In a real implementation, update the database
    // For now, we'll just simulate the operation
    
    if (markAllAsRead) {
      // Mark all feedback as read for this assessment
      console.log(`Marking all feedback as read for assessment ${assessmentId}`);
    } else if (feedbackId) {
      // Mark specific feedback as read
      console.log(`Marking feedback ${feedbackId} as read for assessment ${assessmentId}`);
    } else {
      return NextResponse.json(
        { errors: ['Either feedbackId or markAllAsRead must be provided'] },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: markAllAsRead 
        ? 'All feedback marked as read'
        : 'Feedback marked as read'
    });
  } catch (error) {
    console.error('Error marking feedback as read:', error);
    return NextResponse.json(
      { errors: ['Failed to mark feedback as read'] },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { errors: ['Method not allowed'] },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { errors: ['Method not allowed'] },
    { status: 405 }
  );
}