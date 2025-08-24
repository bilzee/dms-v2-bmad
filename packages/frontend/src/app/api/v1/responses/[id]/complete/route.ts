import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ResponseStatus,
  type RapidResponse,
} from '@dms/shared';

// Mock database - in production, this would be replaced with actual database calls  
const mockResponses: Record<string, RapidResponse> = {};

// Completion request schema
const CompletionRequestSchema = z.object({
  completionTimestamp: z.coerce.date(),
  completionNotes: z.string().optional(),
});

type CompletionRequestData = z.infer<typeof CompletionRequestSchema>;

// PATCH /api/v1/responses/:id/complete - Complete delivery workflow
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const responseId = params.id;
    const body = await request.json();

    // Validate request body
    const validationResult = CompletionRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid completion data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const completionData: CompletionRequestData = validationResult.data;

    // Get existing response (in production, query from database)
    const existingResponse = mockResponses[responseId];
    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Validate that response can be completed
    if (existingResponse.status === ResponseStatus.DELIVERED) {
      return NextResponse.json(
        { error: 'Response is already completed' },
        { status: 400 }
      );
    }

    if (existingResponse.status === ResponseStatus.CANCELLED) {
      return NextResponse.json(
        { error: 'Cannot complete a cancelled response' },
        { status: 400 }
      );
    }

    // Complete the response
    const completedResponse: RapidResponse = {
      ...existingResponse,
      status: ResponseStatus.DELIVERED,
      deliveredDate: completionData.completionTimestamp,
      updatedAt: new Date(),
    };

    // Add completion notes if provided (extend the response object)
    if (completionData.completionNotes) {
      (completedResponse as any).completionNotes = completionData.completionNotes;
    }

    // Save completed response
    mockResponses[responseId] = completedResponse;

    // Prepare response with completion details
    const responseWithMetrics = {
      data: completedResponse,
      completionMetrics: {
        completedAt: completionData.completionTimestamp,
        previousStatus: existingResponse.status,
        newStatus: ResponseStatus.DELIVERED,
        hasDocumentation: !!completedResponse.deliveryDocumentation,
        evidenceCount: completedResponse.deliveryEvidence?.length || 0,
      },
    };

    return NextResponse.json(responseWithMetrics, { status: 200 });

  } catch (error) {
    console.error('Response completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete response' },
      { status: 500 }
    );
  }
}

// GET /api/v1/responses/:id/complete - Get completion status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    // Extract completion information
    const completionInfo = {
      responseId: response.id,
      status: response.status,
      isCompleted: response.status === ResponseStatus.DELIVERED,
      plannedDate: response.plannedDate,
      deliveredDate: response.deliveredDate,
      completionNotes: (response as any).completionNotes,
      hasDocumentation: !!response.deliveryDocumentation,
      documentationCompleteness: response.deliveryDocumentation ? 100 : 0,
      evidenceCount: response.deliveryEvidence?.length || 0,
    };

    return NextResponse.json({
      data: completionInfo,
    });

  } catch (error) {
    console.error('Get completion status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}