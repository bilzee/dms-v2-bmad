import { NextRequest, NextResponse } from 'next/server';
import { 
  AutoApprovalOverrideRequest,
  ApiResponse,
  VerificationStatus
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface AutoApprovalOverrideResponse extends ApiResponse<{
  overrideId: string;
  processedCount: number;
  failedCount: number;
  results: Array<{
    targetId: string;
    success: boolean;
    error?: string;
  }>;
}> {}

// POST /api/v1/verification/auto-approval/override - Override auto-approved items
export async function POST(request: NextRequest): Promise<NextResponse<AutoApprovalOverrideResponse>> {
  try {
    const body: AutoApprovalOverrideRequest = await request.json();

    // Validate request body
    if (!body.targetType || !['ASSESSMENT', 'RESPONSE'].includes(body.targetType)) {
      return NextResponse.json<AutoApprovalOverrideResponse>(
        {
          success: false,
      data: null,
          errors: ['Invalid target type. Must be ASSESSMENT or RESPONSE'],
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    if (!body.targetIds || !Array.isArray(body.targetIds) || body.targetIds.length === 0) {
      return NextResponse.json<AutoApprovalOverrideResponse>(
        {
          success: false,
      data: null,
          errors: ['Target IDs array is required and cannot be empty'],
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    if (!body.newStatus || !['PENDING', 'REJECTED'].includes(body.newStatus)) {
      return NextResponse.json<AutoApprovalOverrideResponse>(
        {
          success: false,
      data: null,
          errors: ['Invalid new status. Must be PENDING or REJECTED'],
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    if (!body.reason || body.reason.trim().length === 0) {
      return NextResponse.json<AutoApprovalOverrideResponse>(
        {
          success: false,
      data: null,
          errors: ['Override reason is required'],
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    if (!body.reasonDetails || body.reasonDetails.trim().length < 10) {
      return NextResponse.json<AutoApprovalOverrideResponse>(
        {
          success: false,
      data: null,
          errors: ['Detailed reason must be at least 10 characters'],
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    if (!body.coordinatorId || body.coordinatorId.trim().length === 0) {
      return NextResponse.json<AutoApprovalOverrideResponse>(
        {
          success: false,
      data: null,
          errors: ['Coordinator ID is required'],
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database operations
    // This would typically:
    // 1. Validate coordinator permissions
    // 2. Check that target items exist and are AUTO_VERIFIED
    // 3. Update verification status in database
    // 4. Create audit log entries
    // 5. Send notifications to relevant parties
    // 6. Update any dependent systems

    const results = body.targetIds.map(targetId => {
      // Mock processing - in real implementation, update each item
      const success = Math.random() > 0.1; // 90% success rate
      return {
        targetId,
        success,
        errors: [success ? undefined : 'Failed to update status - item may not exist or not be auto-verified'],
      };
    });

    const processedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    // Create override audit record
    const overrideId = `override-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // TODO: Save override record to database
    const overrideRecord = {
      id: overrideId,
      targetType: body.targetType,
      targetIds: body.targetIds.filter((_, index) => results[index].success),
      originalStatus: VerificationStatus.AUTO_VERIFIED,
      newStatus: body.newStatus as VerificationStatus,
      reason: body.reason,
      reasonDetails: body.reasonDetails,
      coordinatorId: body.coordinatorId,
      overriddenAt: new Date(),
    };

    console.log('Override record created:', overrideRecord);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return NextResponse.json<AutoApprovalOverrideResponse>({
      success: true,
      data: {
        overrideId,
        processedCount,
        failedCount,
        results,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        message: `Successfully overrode ${processedCount} items. ${failedCount} items failed to process.`,
      },
    });

  } catch (error) {
    console.error('Failed to process auto-approval override:', error);
    return NextResponse.json<AutoApprovalOverrideResponse>(
      {
        success: false,
      data: null,
        errors: [error instanceof Error ? error.message : 'Internal server error'],
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      },
      { status: 500 }
    );
  }
}
