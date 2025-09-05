import { NextRequest, NextResponse } from 'next/server';
import { ResubmissionRequest, ResubmissionResponse } from '@dms/shared/types/api-status-review';
import { RapidResponse, ResubmissionLog, VerificationStatus, ResponseStatus } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock response data storage
const mockResponseData: Record<string, RapidResponse> = {
  "resp-001": {
    id: "resp-001",
    responseType: "HEALTH" as any,
    status: ResponseStatus.DELIVERED,
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
  }
};

// Mock resubmission logs storage
const mockResubmissionLogs: Record<string, ResubmissionLog[]> = {};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;
    const body: ResubmissionRequest = await request.json();

    // Validate request body
    const { changesDescription, correctedData, addressedFeedbackIds, updatedEvidence } = body;

    if (!changesDescription || !correctedData || !addressedFeedbackIds || addressedFeedbackIds.length === 0) {
      return NextResponse.json(
        {
          data: null,
          message: "Missing required resubmission fields",
          status: "error",
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    // Get current response (mock implementation)
    const currentResponse = mockResponseData[responseId];
    
    if (!currentResponse) {
      return NextResponse.json(
        {
          data: null,
          message: "Response not found",
          status: "error",
          timestamp: new Date(),
        },
        { status: 404 }
      );
    }

    // Validate response can be resubmitted
    if (currentResponse.verificationStatus !== VerificationStatus.REJECTED) {
      return NextResponse.json(
        {
          data: null,
          message: "Only rejected responses can be resubmitted",
          status: "error",
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    // Calculate data changes
    const dataChanges = [];
    
    // Compare corrected data with current data (simplified comparison)
    for (const [key, value] of Object.entries(correctedData)) {
      const currentValue = (currentResponse.data as any)?.[key];
      if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
        dataChanges.push({
          field: key,
          oldValue: currentValue,
          newValue: value,
        });
      }
    }

    // Get current version number
    const existingLogs = mockResubmissionLogs[responseId] || [];
    const currentVersion = existingLogs.length > 0 
      ? Math.max(...existingLogs.map(log => log.version)) 
      : 1;
    const newVersion = currentVersion + 1;

    // Create resubmission log
    const resubmissionLog: ResubmissionLog = {
      id: `resubmission-${Date.now()}`,
      responseId,
      version: newVersion,
      previousVersion: currentVersion,
      resubmittedBy: "current-user-id", // Would get from auth context
      resubmittedAt: new Date(),
      changesDescription,
      addressedFeedbackIds,
      dataChanges,
      status: "PENDING",
    };

    // Update response with corrected data
    const updatedResponse: RapidResponse = {
      ...currentResponse,
      data: correctedData,
      verificationStatus: VerificationStatus.PENDING, // Reset to pending for review
      deliveryEvidence: updatedEvidence 
        ? [...currentResponse.deliveryEvidence, ...updatedEvidence]
        : currentResponse.deliveryEvidence,
      requiresAttention: false, // Clear attention flag after resubmission
      updatedAt: new Date(),
    };

    // Save to mock storage (in real implementation, this would use database transactions)
    mockResponseData[responseId] = updatedResponse;
    
    if (!mockResubmissionLogs[responseId]) {
      mockResubmissionLogs[responseId] = [];
    }
    mockResubmissionLogs[responseId].push(resubmissionLog);

    // In real implementation, this would:
    // 1. Start database transaction
    // 2. Update response record
    // 3. Create resubmission log
    // 4. Mark addressed feedback as resolved
    // 5. Trigger notification workflows
    // 6. Commit transaction

    // Mock triggered workflows
    const triggeredWorkflows = [
      "coordinator-notification",
      "verification-queue-update",
      "feedback-resolution-tracking"
    ];

    const response: ResubmissionResponse = {
      data: {
        response: updatedResponse,
        resubmissionLog,
        triggeredWorkflows,
      },
      message: "Response resubmitted successfully",
      status: "success",
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error("Resubmission API error:", error);
    
    return NextResponse.json(
      {
        data: null,
        message: "Failed to process resubmission",
        status: "error",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;

    // Get resubmission history for the response
    const resubmissionHistory = mockResubmissionLogs[responseId] || [];

    return NextResponse.json({
      data: {
        resubmissionHistory: resubmissionHistory.sort((a, b) => b.version - a.version),
      },
      message: "Resubmission history retrieved successfully",
      status: "success",
      timestamp: new Date(),
    });

  } catch (error) {
    console.error("Get resubmission history API error:", error);
    
    return NextResponse.json(
      {
        data: null,
        message: "Failed to retrieve resubmission history",
        status: "error",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}