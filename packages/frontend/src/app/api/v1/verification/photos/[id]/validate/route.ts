import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PhotoVerificationData, MediaAttachment } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface PhotoValidationResponse extends ApiResponse<{
  photoId: string;
  verification: PhotoVerificationData;
  validationResults: {
    gpsAccuracyValid: boolean;
    timestampValid: boolean;
    metadataComplete: boolean;
    recommendedAction: 'APPROVE' | 'REVIEW' | 'REJECT';
    issues: string[];
  };
}> {}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<PhotoValidationResponse>> {
  try {
    const photoId = params.id;
    
    if (!photoId) {
      return NextResponse.json({
        success: false,
        message: 'Photo ID is required',
        data: null,
        errors: ['Photo ID parameter is missing'],
      } as PhotoValidationResponse, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role
    // For now, we'll mock the database operations

    // Mock: Get photo metadata
    const mockPhoto: MediaAttachment = {
      id: photoId,
      url: `/api/media/delivery-photos/${photoId}.jpg`,
      thumbnailUrl: `/api/media/delivery-photos/${photoId}-thumb.jpg`,
      mimeType: 'image/jpeg',
      size: 2048000,
      metadata: {
        gpsCoordinates: {
          latitude: 9.0579,
          longitude: 7.4951,
          accuracy: 12.5,
          timestamp: new Date('2024-01-15T10:30:00Z'),
          captureMethod: 'GPS',
        },
        timestamp: new Date('2024-01-15T10:30:00Z'),
      },
    };

    if (!mockPhoto) {
      return NextResponse.json({
        success: false,
        message: 'Photo not found',
        data: null,
        errors: ['Photo does not exist or has been deleted'],
      } as PhotoValidationResponse, { status: 404 });
    }

    // Validate GPS accuracy
    const gpsAccuracy = mockPhoto.metadata?.gpsCoordinates?.accuracy || 0;
    const gpsAccuracyValid = gpsAccuracy > 0 && gpsAccuracy <= 50; // Within 50 meters is good

    // Validate timestamp
    const timestamp = mockPhoto.metadata?.timestamp;
    const timestampValid = timestamp !== undefined && 
                          timestamp instanceof Date && 
                          !isNaN(timestamp.getTime());

    // Check metadata completeness
    const hasGpsCoordinates = !!mockPhoto.metadata?.gpsCoordinates;
    const hasTimestamp = !!mockPhoto.metadata?.timestamp;
    const metadataComplete = hasGpsCoordinates && hasTimestamp;

    // Determine issues
    const issues: string[] = [];
    
    if (!gpsAccuracyValid) {
      if (gpsAccuracy === 0) {
        issues.push('GPS coordinates are missing');
      } else if (gpsAccuracy > 100) {
        issues.push(`GPS accuracy is poor (±${gpsAccuracy}m)`);
      } else if (gpsAccuracy > 50) {
        issues.push(`GPS accuracy is moderate (±${gpsAccuracy}m)`);
      }
    }

    if (!timestampValid) {
      issues.push('Photo timestamp is missing or invalid');
    }

    if (!metadataComplete) {
      issues.push('Photo metadata is incomplete');
    }

    // Check if photo was taken recently (within reasonable timeframe)
    if (timestamp) {
      const timeDiff = Math.abs(Date.now() - timestamp.getTime());
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 30) {
        issues.push('Photo appears to be older than 30 days');
      }
    }

    // Determine recommended action
    let recommendedAction: 'APPROVE' | 'REVIEW' | 'REJECT';
    
    if (issues.length === 0) {
      recommendedAction = 'APPROVE';
    } else if (issues.some(issue => 
      issue.includes('missing') || 
      issue.includes('invalid') || 
      issue.includes('incomplete')
    )) {
      recommendedAction = 'REJECT';
    } else {
      recommendedAction = 'REVIEW';
    }

    // Create verification data
    const verification: PhotoVerificationData = {
      photoId,
      gpsAccuracy,
      timestampAccuracy: timestampValid,
      qualityScore: 7, // Default quality score, can be adjusted by verifier
      relevanceScore: 8, // Default relevance score, can be adjusted by verifier
      verifierNotes: issues.length > 0 ? `Validation issues found: ${issues.join(', ')}` : 'Photo metadata validation passed',
      verificationStatus: recommendedAction === 'APPROVE' ? 'VERIFIED' : 
                         recommendedAction === 'REJECT' ? 'REJECTED' : 'PENDING',
    };

    // TODO: Replace with actual database update
    // await savePhotoVerification(photoId, verification);

    const response: PhotoValidationResponse = {
      success: true,
      message: 'Photo metadata validation completed',
      data: {
        photoId,
        verification,
        validationResults: {
          gpsAccuracyValid,
          timestampValid,
          metadataComplete,
          recommendedAction,
          issues,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error validating photo metadata:', error);
    
    const errorResponse: PhotoValidationResponse = {
      success: false,
      message: 'Internal server error occurred while validating photo metadata',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to validate photo metadata.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to validate photo metadata.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to validate photo metadata.' },
    { status: 405 }
  );
}