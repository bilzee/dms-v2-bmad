import { NextRequest, NextResponse } from 'next/server';
import {
  type RapidResponse,
  type DeliveryDocumentation,
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock database - in production, this would be replaced with actual database calls
const mockResponses: Record<string, RapidResponse> = {};

// GET /api/v1/responses/:id/documentation - Get delivery documentation details
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

    // Check if response has delivery documentation
    if (!response.deliveryDocumentation) {
      return NextResponse.json(
        { error: 'No delivery documentation found for this response' },
        { status: 404 }
      );
    }

    // Extract delivery documentation details
    const documentationDetails = {
      responseId: response.id,
      responseStatus: response.status,
      documentation: response.deliveryDocumentation,
      deliveryEvidence: response.deliveryEvidence || [],
      completedAt: response.deliveredDate,
      
      // Additional metrics
      metrics: {
        evidencePhotoCount: response.deliveryEvidence?.length || 0,
        beneficiariesReached: response.deliveryDocumentation.beneficiaryVerification.totalBeneficiariesServed,
        deliveryCompleteness: calculateDocumentationCompleteness(response.deliveryDocumentation),
        hasWitnessVerification: !!response.deliveryDocumentation.witnessDetails,
        conditionsReported: response.deliveryDocumentation.deliveryConditions.length,
      }
    };

    return NextResponse.json({
      data: documentationDetails,
    });

  } catch (error) {
    console.error('Get delivery documentation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate documentation completeness
function calculateDocumentationCompleteness(documentation: DeliveryDocumentation): number {
  const requirements = [
    documentation.deliveryLocation.latitude !== 0, // GPS location captured
    documentation.beneficiaryVerification.totalBeneficiariesServed > 0, // Beneficiaries verified
    documentation.deliveryNotes.length > 0, // Delivery notes provided
    documentation.deliveryConditions.length >= 0, // Conditions documented (can be empty)
    !!documentation.completionTimestamp, // Completion timestamp exists
  ];

  const completedRequirements = requirements.filter(Boolean).length;
  return Math.round((completedRequirements / requirements.length) * 100);
}

// PUT /api/v1/responses/:id/documentation - Update delivery documentation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const responseId = params.id;
    const body = await request.json();
    
    // Get existing response
    const existingResponse = mockResponses[responseId];
    if (!existingResponse) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Validate that response has existing documentation
    if (!existingResponse.deliveryDocumentation) {
      return NextResponse.json(
        { error: 'No existing documentation to update' },
        { status: 400 }
      );
    }

    // Update delivery documentation
    const updatedDocumentation: DeliveryDocumentation = {
      ...existingResponse.deliveryDocumentation,
      ...body.documentation,
      // Preserve original creation data
      documentationId: existingResponse.deliveryDocumentation.documentationId,
      completionTimestamp: existingResponse.deliveryDocumentation.completionTimestamp,
    };

    // Update response with modified documentation
    const updatedResponse: RapidResponse = {
      ...existingResponse,
      deliveryDocumentation: updatedDocumentation,
      updatedAt: new Date(),
    };

    // Save updated response
    mockResponses[responseId] = updatedResponse;

    return NextResponse.json({
      data: updatedResponse,
      message: 'Delivery documentation updated successfully',
    });

  } catch (error) {
    console.error('Update delivery documentation error:', error);
    return NextResponse.json(
      { error: 'Failed to update delivery documentation' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/responses/:id/documentation - Remove delivery documentation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    // Remove delivery documentation
    const updatedResponse: RapidResponse = {
      ...existingResponse,
      deliveryDocumentation: undefined,
      updatedAt: new Date(),
    };

    // Save updated response
    mockResponses[responseId] = updatedResponse;

    return NextResponse.json({
      data: updatedResponse,
      message: 'Delivery documentation removed successfully',
    });

  } catch (error) {
    console.error('Delete delivery documentation error:', error);
    return NextResponse.json(
      { error: 'Failed to remove delivery documentation' },
      { status: 500 }
    );
  }
}
