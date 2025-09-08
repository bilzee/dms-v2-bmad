import { NextRequest, NextResponse } from 'next/server';
import { 
  RapidResponse, 
  PartialDeliveryUpdateRequest, 
  PartialDeliveryResponse, 
  PartialDeliveryData,
  ItemCompletionData,
  FollowUpTask,
  ResponseStatus,
  ResponseType,
  VerificationStatus,
  SyncStatus
} from '@dms/shared';
import { z } from 'zod';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Validation schema for partial delivery update
const partialDeliveryUpdateSchema = z.object({
  itemCompletionTracking: z.array(z.object({
    item: z.string().min(1),
    plannedQuantity: z.number().min(0),
    deliveredQuantity: z.number().min(0),
    remainingQuantity: z.number().min(0),
    percentageComplete: z.number().min(0).max(100),
    unit: z.string().min(1),
    reasonCodes: z.array(z.string()),
    followUpRequired: z.boolean(),
  })),
  reasonCodes: z.array(z.object({
    code: z.string().min(1),
    category: z.enum(['SUPPLY_SHORTAGE', 'ACCESS_LIMITATION', 'SECURITY_ISSUE', 'WEATHER_DELAY', 'LOGISTICS_CHALLENGE', 'BENEFICIARY_UNAVAILABLE', 'OTHER']),
    description: z.string().min(1),
    appliesTo: z.array(z.string()),
  })),
  partialDeliveryTimestamp: z.string().transform((str) => new Date(str)),
  estimatedCompletionDate: z.string().transform((str) => new Date(str)).optional(),
  followUpTasks: z.array(z.object({
    type: z.enum(['COMPLETE_DELIVERY', 'SUPPLY_PROCUREMENT', 'ACCESS_NEGOTIATION', 'SECURITY_CLEARANCE']),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    estimatedDate: z.string().transform((str) => new Date(str)),
    assignedTo: z.string().optional(),
    description: z.string().min(1),
  })),
});

// Generate unique ID for follow-up tasks
function generateTaskId(): string {
  return `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique delivery ID
function generateDeliveryId(): string {
  return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate tracking metrics
function calculateTrackingMetrics(itemTracking: ItemCompletionData[]) {
  const totalItems = itemTracking.length;
  const itemsFullyDelivered = itemTracking.filter(item => item.percentageComplete >= 100).length;
  const itemsPartiallyDelivered = itemTracking.filter(item => 
    item.percentageComplete > 0 && item.percentageComplete < 100
  ).length;
  const itemsPending = itemTracking.filter(item => item.percentageComplete === 0).length;
  
  const totalPercentageComplete = totalItems > 0 
    ? itemTracking.reduce((sum, item) => sum + item.percentageComplete, 0) / totalItems 
    : 0;

  return {
    totalPercentageComplete: Math.round(totalPercentageComplete * 100) / 100,
    itemsFullyDelivered,
    itemsPartiallyDelivered,
    itemsPending,
    followUpTasksGenerated: 0, // Will be updated after tasks are generated
  };
}

// Mock database functions - In real implementation, these would interact with actual database
async function getResponseById(id: string): Promise<RapidResponse | null> {
  // In development, return mock response data
  // In production, this would query the actual database
  const mockResponse: RapidResponse = {
    id,
    responseType: ResponseType.FOOD,
    status: ResponseStatus.IN_PROGRESS,
    plannedDate: new Date('2024-08-20'),
    affectedEntityId: 'entity-1',
    assessmentId: 'assessment-1',
    responderId: 'responder-1',
    responderName: 'John Doe',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: SyncStatus.SYNCED,
    data: {
      foodItemsDelivered: [
        { item: 'Rice', quantity: 100, unit: 'kg' },
        { item: 'Cooking Oil', quantity: 20, unit: 'liters' },
      ],
      householdsServed: 50,
      personsServed: 200,
      nutritionSupplementsProvided: 0,
    },
    otherItemsDelivered: [
      { item: 'Rice', quantity: 100, unit: 'kg' },
      { item: 'Cooking Oil', quantity: 20, unit: 'liters' },
      { item: 'Blankets', quantity: 50, unit: 'pieces' },
    ],
    deliveryEvidence: [],
    createdAt: new Date('2024-08-15'),
    updatedAt: new Date('2024-08-20'),
  };
  
  return mockResponse;
}

async function updateResponsePartialDelivery(
  responseId: string, 
  partialDeliveryData: PartialDeliveryData
): Promise<RapidResponse> {
  // In real implementation, this would update the database
  const response = await getResponseById(responseId);
  if (!response) {
    throw new Error('Response not found');
  }

  // Update response with partial delivery data
  const updatedResponse: RapidResponse = {
    ...response,
    partialDeliveryData,
    status: partialDeliveryData.totalPercentageComplete >= 100 
      ? ResponseStatus.DELIVERED 
      : ResponseStatus.IN_PROGRESS,
    updatedAt: new Date(),
  };

  return updatedResponse;
}

// PATCH endpoint for updating partial delivery
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;
    
    // Parse request body
    const body = await request.json();
    const validatedData = partialDeliveryUpdateSchema.parse(body);

    // Verify response exists
    const response = await getResponseById(responseId);
    if (!response) {
      return NextResponse.json(
        { errors: ['Response not found'] },
        { status: 404 }
      );
    }

    // Verify response is in correct status for partial delivery updates
    if (!['PLANNED', 'IN_PROGRESS'].includes(response.status)) {
      return NextResponse.json(
        { errors: ['Partial delivery can only be updated for planned or in-progress responses'] },
        { status: 400 }
      );
    }

    // Generate follow-up tasks with IDs
    const followUpTasks: FollowUpTask[] = validatedData.followUpTasks.map(task => ({
      id: generateTaskId(),
      type: task.type,
      priority: task.priority,
      estimatedDate: task.estimatedDate,
      assignedTo: task.assignedTo,
      description: task.description,
      status: 'PENDING' as const,
    }));

    // Calculate metrics
    const trackingMetrics = calculateTrackingMetrics(validatedData.itemCompletionTracking);
    trackingMetrics.followUpTasksGenerated = followUpTasks.length;

    // Create partial delivery data
    const partialDeliveryData: PartialDeliveryData = {
      deliveryId: generateDeliveryId(),
      totalPercentageComplete: trackingMetrics.totalPercentageComplete,
      itemCompletionTracking: validatedData.itemCompletionTracking,
      reasonCodes: validatedData.reasonCodes,
      followUpRequired: trackingMetrics.itemsFullyDelivered < trackingMetrics.itemsFullyDelivered + trackingMetrics.itemsPartiallyDelivered + trackingMetrics.itemsPending,
      followUpTasks,
      partialDeliveryTimestamp: validatedData.partialDeliveryTimestamp,
      estimatedCompletionDate: validatedData.estimatedCompletionDate,
    };

    // Update response
    const updatedResponse = await updateResponsePartialDelivery(responseId, partialDeliveryData);

    // Prepare response
    const apiResponse: PartialDeliveryResponse = {
      data: updatedResponse,
      trackingMetrics,
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('Partial delivery update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { errors: [error.message] },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving partial delivery data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;

    // Get response with partial delivery data
    const response = await getResponseById(responseId);
    if (!response) {
      return NextResponse.json(
        { errors: ['Response not found'] },
        { status: 404 }
      );
    }

    if (!response.partialDeliveryData) {
      return NextResponse.json(
        { errors: ['No partial delivery data found for this response'] },
        { status: 404 }
      );
    }

    // Calculate current metrics
    const trackingMetrics = calculateTrackingMetrics(response.partialDeliveryData.itemCompletionTracking);
    trackingMetrics.followUpTasksGenerated = response.partialDeliveryData.followUpTasks.length;

    const apiResponse: PartialDeliveryResponse = {
      data: response,
      trackingMetrics,
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('Get partial delivery error:', error);

    return NextResponse.json(
      { errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}