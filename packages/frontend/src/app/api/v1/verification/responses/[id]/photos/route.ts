import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, MediaAttachment, RapidResponse } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface ResponsePhotosResponse extends ApiResponse<{
  photos: MediaAttachment[];
  responseId: string;
  photoCount: number;
}> {}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ResponsePhotosResponse>> {
  try {
    const responseId = params.id;
    
    if (!responseId) {
      return NextResponse.json({
        success: false,
      data: null,
        message: 'Response ID is required',
        data: null,
        errors: ['Response ID parameter is missing'],
      } as ResponsePhotosResponse, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role
    // For now, we'll mock the database operations

    // Mock: Check if response exists
    const mockResponse: Partial<RapidResponse> = {
      id: responseId,
      verificationStatus: 'PENDING',
      responseType: 'HEALTH',
    };

    if (!mockResponse) {
      return NextResponse.json({
        success: false,
      data: null,
        message: 'Response not found',
        data: null,
        errors: ['Response does not exist or has been deleted'],
      } as ResponsePhotosResponse, { status: 404 });
    }

    // Mock delivery photos with GPS metadata
    const mockPhotos: MediaAttachment[] = [
      {
        id: `photo-${responseId}-1`,
        url: '/api/media/delivery-photos/sample-1.jpg',
        thumbnailUrl: '/api/media/delivery-photos/sample-1-thumb.jpg',
        mimeType: 'image/jpeg',
        size: 2048000, // 2MB
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
      },
      {
        id: `photo-${responseId}-2`,
        url: '/api/media/delivery-photos/sample-2.jpg',
        thumbnailUrl: '/api/media/delivery-photos/sample-2-thumb.jpg',
        mimeType: 'image/jpeg',
        size: 1876000, // 1.8MB
        metadata: {
          gpsCoordinates: {
            latitude: 9.0582,
            longitude: 7.4949,
            accuracy: 8.3,
            timestamp: new Date('2024-01-15T10:32:00Z'),
            captureMethod: 'GPS',
          },
          timestamp: new Date('2024-01-15T10:32:00Z'),
        },
      },
      {
        id: `photo-${responseId}-3`,
        url: '/api/media/delivery-photos/sample-3.jpg',
        thumbnailUrl: '/api/media/delivery-photos/sample-3-thumb.jpg',
        mimeType: 'image/jpeg',
        size: 2234000, // 2.2MB
        metadata: {
          gpsCoordinates: {
            latitude: 9.0580,
            longitude: 7.4953,
            accuracy: 15.7,
            timestamp: new Date('2024-01-15T10:35:00Z'),
            captureMethod: 'GPS',
          },
          timestamp: new Date('2024-01-15T10:35:00Z'),
        },
      },
    ];

    // TODO: Replace with actual database query
    // const photos = await getResponseDeliveryPhotos(responseId);

    const response: ResponsePhotosResponse = {
      success: true,
      message: 'Response photos retrieved successfully',
      data: {
        photos: mockPhotos,
        responseId,
        photoCount: mockPhotos.length,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error retrieving response photos:', error);
    
    const errorResponse: ResponsePhotosResponse = {
      success: false,
      data: null,
      message: 'Internal server error occurred while retrieving photos',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use GET to retrieve photos.'] },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use GET to retrieve photos.'] },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { errors: ['Method not allowed. Use GET to retrieve photos.'] },
    { status: 405 }
  );
}