import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PhotoVerificationData } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface PhotoAnnotationRequest {
  qualityScore?: number;
  relevanceScore?: number;
  verifierNotes?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

interface PhotoAnnotationResponse extends ApiResponse<{
  photoId: string;
  annotation: PhotoVerificationData;
  updatedAt: Date;
}> {}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<PhotoAnnotationResponse>> {
  try {
    const photoId = params.id;
    
    if (!photoId) {
      return NextResponse.json({
        success: false,
        message: 'Photo ID is required',
        errors: ['Photo ID parameter is missing'],
      } as any, { status: 400 });
    }

    const body: PhotoAnnotationRequest = await request.json();
    
    // Validate annotation data
    if (body.qualityScore !== undefined && (body.qualityScore < 1 || body.qualityScore > 10)) {
      return NextResponse.json({
        success: false,
        message: 'Quality score must be between 1 and 10',
        errors: ['qualityScore must be a number between 1 and 10'],
      } as any, { status: 400 });
    }

    if (body.relevanceScore !== undefined && (body.relevanceScore < 1 || body.relevanceScore > 10)) {
      return NextResponse.json({
        success: false,
        message: 'Relevance score must be between 1 and 10',
        errors: ['relevanceScore must be a number between 1 and 10'],
      } as any, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role
    // For now, we'll mock the database operations

    // Mock: Check if photo exists
    const existingAnnotation: PhotoVerificationData = {
      photoId,
      gpsAccuracy: 12.5, // From photo metadata
      timestampAccuracy: true, // From photo metadata validation
      qualityScore: body.qualityScore || 5,
      relevanceScore: body.relevanceScore || 5,
      verifierNotes: body.verifierNotes || '',
      verificationStatus: body.verificationStatus || 'PENDING',
    };

    // TODO: Replace with actual database update
    // const updatedAnnotation = await updatePhotoAnnotation(photoId, body);
    
    const updatedAnnotation: PhotoVerificationData = {
      ...existingAnnotation,
      ...body,
      photoId, // Ensure photoId is preserved
    };

    const updatedAt = new Date();
    
    // Mock: Log annotation update for audit trail
    console.log(`Photo ${photoId} annotation updated at ${updatedAt.toISOString()}`);

    const response: PhotoAnnotationResponse = {
      success: true,
      message: 'Photo annotation updated successfully',
      data: {
        photoId,
        annotation: updatedAnnotation,
        updatedAt,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error updating photo annotation:', error);
    
    const errorResponse = {
      success: false,
      message: 'Internal server error occurred while updating photo annotation',
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse as any, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST to annotate photos.'] },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST to annotate photos.'] },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use POST to annotate photos.'] },
    { status: 405 }
  );
}