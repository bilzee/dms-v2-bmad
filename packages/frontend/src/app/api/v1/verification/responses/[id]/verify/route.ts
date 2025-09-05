import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { 
  ApiResponse, 
  RapidResponse, 
  PhotoVerificationData, 
  ResponseVerificationMetrics,
  VerificationStatus,
  UserRoleType
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface ResponseVerificationRequest {
  status: 'VERIFIED' | 'REJECTED';
  verifierNotes: string;
  coordinatorId: string;
  coordinatorName: string;
  photoVerifications: Record<string, PhotoVerificationData>;
  responseMetrics: ResponseVerificationMetrics | null;
  verificationData: {
    photosVerified: boolean;
    metricsVerified: boolean;
    accountabilityVerified: boolean;
  };
}

interface ResponseVerificationResponse extends ApiResponse<{
  responseId: string;
  verificationStatus: VerificationStatus;
  verifiedBy: string;
  verifiedAt: Date;
  verificationSummary: {
    totalPhotos: number;
    photosVerified: number;
    photosRejected: number;
    overallCompleteness: number;
    varianceFlags: number;
    accountabilityScore: number;
  };
}> {}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ResponseVerificationResponse>> {
  try {
    const responseId = params.id;
    
    if (!responseId) {
      return NextResponse.json({
        success: false,
        message: 'Response ID is required',
        data: null,
        errors: ['Response ID parameter is missing'],
      } as ResponseVerificationResponse, { status: 400 });
    }

    const body: ResponseVerificationRequest = await request.json();
    
    // Validate request body
    if (!body.coordinatorId || !body.coordinatorName) {
      return NextResponse.json({
        success: false,
        message: 'Coordinator information is required',
        data: null,
        errors: ['coordinatorId and coordinatorName are required'],
      } as ResponseVerificationResponse, { status: 400 });
    }

    if (!body.status || !['VERIFIED', 'REJECTED'].includes(body.status)) {
      return NextResponse.json({
        success: false,
        message: 'Valid verification status is required',
        data: null,
        errors: ['status must be either VERIFIED or REJECTED'],
      } as ResponseVerificationResponse, { status: 400 });
    }

    // Validate verification completeness
    if (body.status === 'VERIFIED') {
      const { photosVerified, metricsVerified, accountabilityVerified } = body.verificationData;
      
      if (!photosVerified || !metricsVerified || !accountabilityVerified) {
        return NextResponse.json({
          success: false,
          message: 'All verification components must be completed before approval',
          data: null,
          errors: ['Photos, metrics, and accountability must all be verified'],
        } as ResponseVerificationResponse, { status: 400 });
      }
    }

    // Authentication check
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - session required',
        data: null,
        errors: ['Authentication required'],
      } as ResponseVerificationResponse, { status: 401 });
    }

    // Verify coordinator role
    if (session.user.role !== UserRoleType.COORDINATOR) {
      return NextResponse.json({
        success: false,
        message: 'Access denied - coordinator role required',
        data: null,
        errors: ['Coordinator role required for verification'],
      } as ResponseVerificationResponse, { status: 403 });
    }

    // Check if response exists and is in PENDING status
    const existingResponse = await prisma.rapidResponse.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        verificationStatus: true,
        responderId: true,
        responderName: true,
        responseType: true,
        status: true
      }
    });

    if (!existingResponse) {
      return NextResponse.json({
        success: false,
        message: 'Response not found',
        data: null,
        errors: ['Response does not exist'],
      } as ResponseVerificationResponse, { status: 404 });
    }

    if (existingResponse.verificationStatus !== VerificationStatus.PENDING) {
      return NextResponse.json({
        success: false,
        message: 'Response not in pending status',
        data: null,
        errors: ['Response must be in PENDING status to be verified'],
      } as ResponseVerificationResponse, { status: 400 });
    }

    const verificationTimestamp = new Date();
    
    // Calculate verification summary
    const photoVerifications = Object.values(body.photoVerifications || {});
    const totalPhotos = photoVerifications.length;
    const photosVerified = photoVerifications.filter(p => p.verificationStatus === 'VERIFIED').length;
    const photosRejected = photoVerifications.filter(p => p.verificationStatus === 'REJECTED').length;
    
    const overallCompleteness = body.responseMetrics?.deliveryCompleteness || 0;
    const varianceFlags = body.responseMetrics?.varianceFlags.length || 0;
    
    // Calculate accountability score based on various factors
    const accountabilityScore = calculateAccountabilityScore({
      photosVerified,
      totalPhotos,
      overallCompleteness,
      varianceFlags,
      hasTimestamp: body.responseMetrics?.timestampVerified || false,
      hasLocation: body.responseMetrics?.locationVerified || false,
    });

    // Use transaction for data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Update response verification status
      const updatedResponse = await tx.rapidResponse.update({
        where: { id: responseId },
        data: {
          verificationStatus: body.status,
          updatedAt: verificationTimestamp
        }
      });

      // Create verification record
      const verificationRecord = await tx.verification.create({
        data: {
          responseId: responseId,
          verifierId: session.user.id,
          status: body.status,
          verifierNotes: body.verifierNotes,
          verifiedAt: verificationTimestamp,
          metadata: {
            verificationData: body.verificationData,
            photoVerifications: body.photoVerifications,
            responseMetrics: body.responseMetrics,
            verificationSummary: {
              totalPhotos,
              photosVerified,
              photosRejected,
              overallCompleteness,
              varianceFlags,
              accountabilityScore,
            }
          }
        }
      });

      return { response: updatedResponse, verification: verificationRecord };
    });

    // Log verification completion
    console.log(`Response ${responseId} ${body.status.toLowerCase()} by ${session.user.name || 'Unknown'} at ${verificationTimestamp.toISOString()}`);
    console.log(`Verification audit: ${responseId} - Status: ${body.status}, Photos: ${photosVerified}/${totalPhotos}, Completeness: ${overallCompleteness}%`);

    const response: ResponseVerificationResponse = {
      success: true,
      message: `Response ${body.status.toLowerCase()} successfully`,
      data: {
        responseId: result.response.id,
        verificationStatus: result.response.verificationStatus as VerificationStatus,
        verifiedBy: session.user.name || 'Unknown Coordinator',
        verifiedAt: verificationTimestamp,
        verificationSummary: {
          totalPhotos,
          photosVerified,
          photosRejected,
          overallCompleteness,
          varianceFlags,
          accountabilityScore,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error completing response verification:', error);
    
    const errorResponse: ResponseVerificationResponse = {
      success: false,
      message: 'Internal server error occurred while completing verification',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Helper function to calculate accountability score
function calculateAccountabilityScore(factors: {
  photosVerified: number;
  totalPhotos: number;
  overallCompleteness: number;
  varianceFlags: number;
  hasTimestamp: boolean;
  hasLocation: boolean;
}): number {
  let score = 0;
  
  // Photo verification component (0-30 points)
  if (factors.totalPhotos > 0) {
    score += (factors.photosVerified / factors.totalPhotos) * 30;
  } else {
    score += 15; // Partial credit if no photos required
  }
  
  // Delivery completeness component (0-40 points)
  score += (factors.overallCompleteness / 100) * 40;
  
  // Variance penalty (0-10 points deduction)
  const variancePenalty = Math.min(factors.varianceFlags * 2, 10);
  score -= variancePenalty;
  
  // Metadata component (0-20 points)
  if (factors.hasTimestamp) score += 10;
  if (factors.hasLocation) score += 10;
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to verify responses.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to verify responses.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to verify responses.' },
    { status: 405 }
  );
}
