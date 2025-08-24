import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ResponseStatus,
  RapidResponse,
  MediaAttachmentSchema,
  GPSCoordinatesSchema,
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