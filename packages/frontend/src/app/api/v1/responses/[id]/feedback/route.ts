import { NextRequest, NextResponse } from 'next/server';
import { FeedbackResponse } from '@dms/shared/types/api-status-review';
import { Feedback, ResubmissionLog } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock feedback data for development/testing
const mockFeedbackData: Record<string, { feedback: Feedback[]; resubmissionHistory: ResubmissionLog[] }> = {
  "resp-001": {
    feedback: [
      {
        id: "feedback-001",
        targetType: "RESPONSE",
        targetId: "resp-001",
        coordinatorId: "coord-001",
        coordinatorName: "John Smith",
        feedbackType: "REJECTION",
        reason: "INSUFFICIENT_EVIDENCE",
        comments: "The delivery evidence photos are too blurry to verify the actual items delivered. Please provide clearer photos showing the quantities and beneficiaries.",
        priority: "HIGH",
        requiresResponse: true,
        createdAt: new Date("2024-01-15T10:30:00Z"),
        isRead: true,
        isResolved: false,
      },
      {
        id: "feedback-002",
        targetType: "RESPONSE",
        targetId: "resp-001", 
        coordinatorId: "coord-002",
        coordinatorName: "Sarah Johnson",
        feedbackType: "CLARIFICATION_REQUEST",
        reason: "MISSING_INFO",
        comments: "Could you please clarify how the 50 households were selected for this food distribution? The selection criteria is not clear from the documentation.",
        priority: "NORMAL",
        requiresResponse: true,
        createdAt: new Date("2024-01-14T14:20:00Z"),
        isRead: true,
        isResolved: true,
        resolvedAt: new Date("2024-01-15T09:00:00Z"),
      }
    ],
    resubmissionHistory: [
      {
        id: "resubmission-001",
        responseId: "resp-001",
        version: 2,
        previousVersion: 1,
        resubmittedBy: "user-001",
        resubmittedAt: new Date("2024-01-16T08:00:00Z"),
        changesDescription: "Provided clearer photos of delivered items and added household selection criteria documentation.",
        addressedFeedbackIds: ["feedback-001", "feedback-002"],
        dataChanges: [
          {
            field: "deliveryEvidence",
            oldValue: "2 blurry photos",
            newValue: "5 high-quality photos with clear item visibility"
          },
          {
            field: "beneficiaryVerification.selectionCriteria", 
            oldValue: "Not specified",
            newValue: "Most vulnerable households based on assessment scoring"
          }
        ],
        status: "PENDING"
      }
    ]
  },
  "resp-002": {
    feedback: [
      {
        id: "feedback-003",
        targetType: "RESPONSE",
        targetId: "resp-002",
        coordinatorId: "coord-001", 
        coordinatorName: "John Smith",
        feedbackType: "CLARIFICATION_REQUEST",
        reason: "DATA_QUALITY",
        comments: "The water quality test results seem inconsistent. Can you verify the testing methodology used?",
        priority: "NORMAL",
        requiresResponse: true,
        createdAt: new Date("2024-01-17T11:15:00Z"),
        isRead: false,
        isResolved: false,
      }
    ],
    resubmissionHistory: []
  },
  "resp-003": {
    feedback: [],
    resubmissionHistory: []
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;

    // Validate response ID format (basic validation)
    if (!responseId || typeof responseId !== 'string') {
      return NextResponse.json(
        {
          data: null,
          message: "Invalid response ID provided",
          status: "error",
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    // Get feedback data for the response (mock implementation)
    const feedbackData = mockFeedbackData[responseId] || {
      feedback: [],
      resubmissionHistory: []
    };

    // In real implementation, this would query the database:
    // const feedback = await db.feedback.findMany({
    //   where: {
    //     targetType: 'RESPONSE',
    //     targetId: responseId
    //   },
    //   orderBy: { createdAt: 'desc' }
    // });
    //
    // const resubmissionHistory = await db.resubmissionLog.findMany({
    //   where: { responseId },
    //   orderBy: { version: 'desc' }
    // });

    const response: FeedbackResponse = {
      data: {
        feedback: feedbackData.feedback,
        resubmissionHistory: feedbackData.resubmissionHistory,
      },
      message: "Feedback data retrieved successfully",
      status: "success", 
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Feedback API error:", error);
    
    return NextResponse.json(
      {
        data: null,
        message: "Failed to retrieve feedback data", 
        status: "error",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;
    const body = await request.json();

    // Validate request body
    const { feedbackType, reason, comments, priority, requiresResponse } = body;

    if (!feedbackType || !reason || !comments) {
      return NextResponse.json(
        {
          data: null,
          message: "Missing required feedback fields",
          status: "error",
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    // Create new feedback (mock implementation)
    const newFeedback: Feedback = {
      id: `feedback-${Date.now()}`,
      targetType: "RESPONSE",
      targetId: responseId,
      coordinatorId: "current-user-id", // Would get from auth context
      coordinatorName: "Current User", // Would get from auth context
      feedbackType,
      reason,
      comments,
      priority: priority || "NORMAL",
      requiresResponse: requiresResponse !== false,
      createdAt: new Date(),
      isRead: false,
      isResolved: false,
    };

    // In real implementation, save to database:
    // await db.feedback.create({ data: newFeedback });

    // Add to mock data
    if (!mockFeedbackData[responseId]) {
      mockFeedbackData[responseId] = { feedback: [], resubmissionHistory: [] };
    }
    mockFeedbackData[responseId].feedback.unshift(newFeedback);

    return NextResponse.json({
      data: newFeedback,
      message: "Feedback created successfully",
      status: "success",
      timestamp: new Date(),
    });

  } catch (error) {
    console.error("Create feedback API error:", error);
    
    return NextResponse.json(
      {
        data: null,
        message: "Failed to create feedback",
        status: "error", 
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}