import { NextRequest, NextResponse } from 'next/server';
import { StatusReviewRequest, StatusReviewResponse } from '@dms/shared/types/api-status-review';
import { RapidResponse, VerificationStatus, ResponseType } from '@dms/shared';

// Mock data for development/testing
const mockResponses: RapidResponse[] = [
  {
    id: "resp-001",
    responseType: ResponseType.HEALTH,
    status: "DELIVERED" as any,
    plannedDate: new Date("2024-01-10"),
    deliveredDate: new Date("2024-01-12"),
    affectedEntityId: "entity-001",
    assessmentId: "assess-001",
    responderId: "user-001",
    responderName: "John Doe",
    verificationStatus: VerificationStatus.REJECTED,
    syncStatus: "SYNCED" as any,
    data: {} as any,
    otherItemsDelivered: [],
    deliveryEvidence: [],
    feedbackCount: 2,
    lastFeedbackAt: new Date("2024-01-15"),
    requiresAttention: true,
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "resp-002", 
    responseType: ResponseType.WASH,
    status: "DELIVERED" as any,
    plannedDate: new Date("2024-01-14"),
    deliveredDate: new Date("2024-01-16"),
    affectedEntityId: "entity-002",
    assessmentId: "assess-002",
    responderId: "user-002",
    responderName: "Jane Smith",
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: "SYNCED" as any,
    data: {} as any,
    otherItemsDelivered: [],
    deliveryEvidence: [],
    feedbackCount: 1,
    lastFeedbackAt: new Date("2024-01-17"),
    requiresAttention: false,
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-17"),
  },
  {
    id: "resp-003",
    responseType: ResponseType.FOOD,
    status: "DELIVERED" as any,
    plannedDate: new Date("2024-01-18"),
    deliveredDate: new Date("2024-01-20"),
    affectedEntityId: "entity-003",
    assessmentId: "assess-003", 
    responderId: "user-003",
    responderName: "Bob Johnson",
    verificationStatus: VerificationStatus.VERIFIED,
    syncStatus: "SYNCED" as any,
    data: {} as any,
    otherItemsDelivered: [],
    deliveryEvidence: [],
    feedbackCount: 0,
    requiresAttention: false,
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date("2024-01-20"),
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const verificationStatusParam = searchParams.get('verificationStatus');
    const responseTypeParam = searchParams.get('responseType');
    const requiresAttentionParam = searchParams.get('requiresAttention');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Convert parameters to filters
    const filters: StatusReviewRequest = {};
    
    if (verificationStatusParam) {
      filters.verificationStatus = verificationStatusParam.split(',') as VerificationStatus[];
    }
    
    if (responseTypeParam) {
      filters.responseType = responseTypeParam.split(',') as ResponseType[];
    }
    
    if (requiresAttentionParam) {
      filters.requiresAttention = requiresAttentionParam === 'true';
    }
    
    if (startDateParam && endDateParam) {
      filters.dateRange = {
        start: new Date(startDateParam),
        end: new Date(endDateParam)
      };
    }

    // Filter responses based on criteria
    let filteredResponses = mockResponses;

    if (filters.verificationStatus) {
      filteredResponses = filteredResponses.filter(r => 
        filters.verificationStatus!.includes(r.verificationStatus)
      );
    }

    if (filters.responseType) {
      filteredResponses = filteredResponses.filter(r =>
        filters.responseType!.includes(r.responseType)
      );
    }

    if (filters.requiresAttention !== undefined) {
      filteredResponses = filteredResponses.filter(r =>
        r.requiresAttention === filters.requiresAttention
      );
    }

    if (filters.dateRange) {
      filteredResponses = filteredResponses.filter(r => {
        const responseDate = new Date(r.createdAt);
        return responseDate >= filters.dateRange!.start && 
               responseDate <= filters.dateRange!.end;
      });
    }

    // Calculate summary statistics
    const feedbackSummary = {
      totalFeedback: filteredResponses.reduce((sum, r) => sum + (r.feedbackCount || 0), 0),
      unreadFeedback: Math.floor(filteredResponses.reduce((sum, r) => sum + (r.feedbackCount || 0), 0) * 0.3),
      urgentFeedback: Math.floor(filteredResponses.reduce((sum, r) => sum + (r.feedbackCount || 0), 0) * 0.1),
      pendingResubmissions: filteredResponses.filter(r => 
        r.verificationStatus === VerificationStatus.REJECTED
      ).length,
    };

    const verificationStats = {
      pending: filteredResponses.filter(r => r.verificationStatus === VerificationStatus.PENDING).length,
      verified: filteredResponses.filter(r => r.verificationStatus === VerificationStatus.VERIFIED).length,
      rejected: filteredResponses.filter(r => r.verificationStatus === VerificationStatus.REJECTED).length,
      requiresAttention: filteredResponses.filter(r => r.requiresAttention).length,
    };

    const response: StatusReviewResponse = {
      data: {
        responses: filteredResponses,
        feedbackSummary,
        verificationStats,
      },
      message: "Status review data retrieved successfully",
      status: "success",
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Status review API error:", error);
    
    return NextResponse.json(
      {
        data: null,
        message: "Failed to retrieve status review data",
        status: "error",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}