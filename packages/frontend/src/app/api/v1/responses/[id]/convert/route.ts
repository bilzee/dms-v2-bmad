import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ResponseConversionRequestSchema,
  ResponseConversionRequest,
  ResponseConversionResponse,
  ResponseStatus,
  RapidResponse,
  generateOfflineId,
} from '@dms/shared';

// Mock database - in production, this would be replaced with actual database calls
const mockResponses: Record<string, RapidResponse> = {};

// Conversion endpoint - PUT /api/v1/responses/[id]/convert
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;
    
    // Validate request body
    const body = await request.json();
    const validatedData = ResponseConversionRequestSchema.parse(body);

    // Check if response exists (in production, query from database)
    let existingResponse = mockResponses[responseId];

    if (!existingResponse && process.env.NODE_ENV === 'development') {
      // Use seed data for development
      const { seedResponses } = await import('../../../../../../lib/dev-data/seed-responses');
      const foundResponse = seedResponses.find(r => r.id === responseId);
      if (foundResponse) {
        existingResponse = foundResponse;
      }
      if (existingResponse) {
        mockResponses[responseId] = existingResponse;
      }
    }

    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    const response = mockResponses[responseId];

    // Validate that response can be converted
    if (response.status !== ResponseStatus.PLANNED) {
      return NextResponse.json(
        {
          error: 'Response cannot be converted',
          message: `Only planned responses can be converted. Current status: ${response.status}`,
        },
        { status: 400 }
      );
    }

    // Create conversion log
    const conversionLog = {
      convertedAt: new Date(),
      convertedBy: 'current-user', // In production, get from auth context
      originalStatus: response.status,
      newStatus: ResponseStatus.DELIVERED,
      dataChanges: [
        `Status changed from ${response.status} to ${ResponseStatus.DELIVERED}`,
        `Delivery timestamp set to ${validatedData.deliveryTimestamp.toISOString()}`,
        `GPS location captured: ${validatedData.deliveryLocation.latitude}, ${validatedData.deliveryLocation.longitude}`,
        `Beneficiaries served: ${validatedData.beneficiariesServed}`,
        ...(validatedData.deliveryNotes ? [`Notes: ${validatedData.deliveryNotes}`] : []),
        ...(validatedData.challenges ? [`Challenges: ${validatedData.challenges}`] : []),
      ],
    };

    // Update response with conversion data
    const updatedResponse: RapidResponse = {
      ...response,
      status: ResponseStatus.DELIVERED,
      deliveredDate: validatedData.deliveryTimestamp,
      data: validatedData.actualData as any,
      otherItemsDelivered: validatedData.actualItemsDelivered,
      deliveryEvidence: validatedData.deliveryEvidence,
      updatedAt: new Date(),
    };

    // Save updated response (in production, save to database)
    mockResponses[responseId] = updatedResponse;

    // Create response
    const conversionResponse: ResponseConversionResponse = {
      data: updatedResponse,
      conversionLog,
    };

    return NextResponse.json(conversionResponse, { status: 200 });

  } catch (error) {
    console.error('Conversion error:', error);

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
        message: 'Failed to convert response',
      },
      { status: 500 }
    );
  }
}

// Get conversion comparison data - GET /api/v1/responses/[id]/convert
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;
    
    // Get response (in production, query from database)
    let response = mockResponses[responseId];

    if (!response && process.env.NODE_ENV === 'development') {
      // Use seed data for development
      const { seedResponses } = await import('../../../../../../lib/dev-data/seed-responses');
      response = seedResponses.find(r => r.id === responseId) || null;
      if (response) {
        mockResponses[responseId] = response;
      }
    }

    if (!response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Check if response is convertible
    if (response.status !== ResponseStatus.PLANNED) {
      return NextResponse.json(
        {
          error: 'Response not convertible',
          message: `Response status is ${response.status}, only PLANNED responses can be converted`,
        },
        { status: 400 }
      );
    }

    // Return response data for conversion interface
    return NextResponse.json({
      data: response,
      convertible: true,
      plannedItems: response.otherItemsDelivered,
      plannedDate: response.plannedDate,
      responseType: response.responseType,
    });

  } catch (error) {
    console.error('Get conversion data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}