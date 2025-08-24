import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ResponseStatus,
  RapidResponse,
  MediaAttachmentSchema,
  GPSCoordinatesSchema,
  DeliveryDocumentationRequestSchema,
  type DeliveryDocumentationRequest,
  type DeliveryDocumentationResponse,
  generateOfflineId,
} from '@dms/shared';

// Mock database - in production, this would be replaced with actual database calls
const mockResponses: Record<string, RapidResponse> = {};

// Delivery update schema for PATCH requests
const DeliveryUpdateSchema = z.object({
  beneficiariesServed: z.number().int().min(0).optional(),
  deliveryNotes: z.string().max(1000).optional(),
  challenges: z.string().max(1000).optional(),
  deliveryEvidence: z.array(MediaAttachmentSchema).optional(),
  deliveryLocation: GPSCoordinatesSchema.optional(),
  deliveryTimestamp: z.coerce.date().optional(),
});

type DeliveryUpdateData = z.infer<typeof DeliveryUpdateSchema>;

// POST /api/v1/responses/:id/delivery - Create comprehensive delivery documentation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<DeliveryDocumentationResponse | { error: string }>> {
  try {
    const responseId = params.id;
    const body = await request.json();

    // Validate request body
    const validationResult = DeliveryDocumentationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid delivery documentation data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const deliveryData: DeliveryDocumentationRequest = validationResult.data;

    // Get existing response (in production, query from database)
    const existingResponse = mockResponses[responseId];
    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Validate that response can be documented
    if (![ResponseStatus.PLANNED, ResponseStatus.IN_PROGRESS].includes(existingResponse.status)) {
      return NextResponse.json(
        {
          error: 'Response cannot be documented',
          message: `Response status ${existingResponse.status} does not allow delivery documentation`,
        },
        { status: 400 }
      );
    }

    // Create delivery documentation
    const documentationId = generateOfflineId();
    const deliveryDocumentation = {
      documentationId,
      completionTimestamp: deliveryData.completionTimestamp,
      deliveryLocation: deliveryData.deliveryLocation,
      beneficiaryVerification: deliveryData.beneficiaryVerification,
      deliveryNotes: deliveryData.deliveryNotes,
      deliveryConditions: deliveryData.deliveryConditions,
      witnessDetails: deliveryData.witnessDetails,
      deliveryCompletionStatus: 'FULL' as const,
      followUpRequired: false,
    };

    // Update response with delivery documentation
    const updatedResponse: RapidResponse = {
      ...existingResponse,
      status: ResponseStatus.DELIVERED,
      deliveredDate: deliveryData.completionTimestamp,
      deliveryEvidence: [
        ...(existingResponse.deliveryEvidence || []),
        ...deliveryData.deliveryEvidence,
      ],
      deliveryDocumentation,
      updatedAt: new Date(),
    };

    // Save updated response
    mockResponses[responseId] = updatedResponse;

    // Calculate documentation metrics
    const documentationMetrics = {
      totalBeneficiariesReached: deliveryData.beneficiaryVerification.totalBeneficiariesServed,
      documentationCompleteness: calculateCompleteness(deliveryData),
      evidencePhotoCount: deliveryData.deliveryEvidence.length,
      verificationMethodUsed: deliveryData.beneficiaryVerification.verificationMethod,
      deliveryCompletionTime: deliveryData.completionTimestamp,
    };

    const response: DeliveryDocumentationResponse = {
      data: updatedResponse,
      documentationMetrics,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Delivery documentation creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create delivery documentation' },
      { status: 500 }
    );
  }
}

// Calculate documentation completeness percentage
function calculateCompleteness(deliveryData: DeliveryDocumentationRequest): number {
  const requirements = [
    deliveryData.deliveryLocation.latitude !== 0, // GPS location captured
    deliveryData.beneficiaryVerification.totalBeneficiariesServed > 0, // Beneficiaries verified
    deliveryData.deliveryNotes.length > 0, // Delivery notes provided
    deliveryData.deliveryEvidence.length > 0, // Photo evidence captured
  ];

  const completedRequirements = requirements.filter(Boolean).length;
  return (completedRequirements / requirements.length) * 100;
}

// Update delivery details - PATCH /api/v1/responses/[id]/delivery
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;
    
    // Validate request body
    const body = await request.json();
    const validatedData = DeliveryUpdateSchema.parse(body);

    // Get existing response (in production, query from database)
    const existingResponse = mockResponses[responseId];
    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Validate that response is in a deliverable state
    if (![ResponseStatus.PLANNED, ResponseStatus.IN_PROGRESS, ResponseStatus.DELIVERED].includes(existingResponse.status)) {
      return NextResponse.json(
        {
          error: 'Response cannot be updated',
          message: `Response status ${existingResponse.status} does not allow delivery updates`,
        },
        { status: 400 }
      );
    }

    // Create update object
    const updates: Partial<RapidResponse> = {
      updatedAt: new Date(),
    };

    // Apply updates only for provided fields
    if (validatedData.deliveryTimestamp !== undefined) {
      updates.deliveredDate = validatedData.deliveryTimestamp;
      // Auto-update status to DELIVERED if not already
      if (existingResponse.status === ResponseStatus.PLANNED) {
        updates.status = ResponseStatus.DELIVERED;
      }
    }

    // Merge delivery evidence
    if (validatedData.deliveryEvidence !== undefined) {
      updates.deliveryEvidence = [
        ...(existingResponse.deliveryEvidence || []),
        ...validatedData.deliveryEvidence,
      ];
    }

    // Apply other updates - these would be stored in response metadata or extended fields
    // For now, we'll store them in a custom field
    const deliveryDetails = {
      ...(existingResponse as any).deliveryDetails,
      ...(validatedData.beneficiariesServed !== undefined && { beneficiariesServed: validatedData.beneficiariesServed }),
      ...(validatedData.deliveryNotes !== undefined && { deliveryNotes: validatedData.deliveryNotes }),
      ...(validatedData.challenges !== undefined && { challenges: validatedData.challenges }),
      ...(validatedData.deliveryLocation !== undefined && { deliveryLocation: validatedData.deliveryLocation }),
    };

    // Update response
    const updatedResponse: RapidResponse = {
      ...existingResponse,
      ...updates,
      deliveryDetails, // Custom field for extended delivery information
    } as RapidResponse & { deliveryDetails: any };

    // Save updated response (in production, save to database)
    mockResponses[responseId] = updatedResponse;

    return NextResponse.json({
      data: updatedResponse,
      message: 'Delivery details updated successfully',
    });

  } catch (error) {
    console.error('Delivery update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update delivery details',
      },
      { status: 500 }
    );
  }
}

// Get delivery details - GET /api/v1/responses/[id]/delivery
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;
    
    // Get response (in production, query from database)
    const response = mockResponses[responseId];
    if (!response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Extract delivery-specific information
    const deliveryInfo = {
      responseId: response.id,
      status: response.status,
      plannedDate: response.plannedDate,
      deliveredDate: response.deliveredDate,
      deliveryEvidence: response.deliveryEvidence || [],
      // Extended delivery details from custom field
      ...(response as any).deliveryDetails,
    };

    return NextResponse.json({
      data: deliveryInfo,
    });

  } catch (error) {
    console.error('Get delivery details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete delivery documentation (revert to planned) - DELETE /api/v1/responses/[id]/delivery
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;
    
    // Get existing response
    const existingResponse = mockResponses[responseId];
    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Only allow reverting delivered responses back to planned
    if (existingResponse.status !== ResponseStatus.DELIVERED) {
      return NextResponse.json(
        {
          error: 'Response cannot be reverted',
          message: `Only delivered responses can be reverted to planned status`,
        },
        { status: 400 }
      );
    }

    // Revert response to planned status
    const revertedResponse: RapidResponse = {
      ...existingResponse,
      status: ResponseStatus.PLANNED,
      deliveredDate: undefined,
      deliveryEvidence: [],
      updatedAt: new Date(),
    };

    // Remove custom delivery details
    delete (revertedResponse as any).deliveryDetails;

    // Save reverted response
    mockResponses[responseId] = revertedResponse;

    return NextResponse.json({
      data: revertedResponse,
      message: 'Response reverted to planned status',
    });

  } catch (error) {
    console.error('Delivery revert error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}