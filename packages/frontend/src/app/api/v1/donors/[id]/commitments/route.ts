import { NextRequest, NextResponse } from 'next/server';
import { 
  DonorCommitment, 
  DonorAchievement,
  ResponseType,
  CommitmentStatus 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock commitment data - would be replaced with actual database calls
const mockCommitments: DonorCommitment[] = [
  {
    id: 'c1',
    donorId: '1',
    donor: {
      id: '1',
      name: 'ActionAid Nigeria',
      organization: 'ActionAid Nigeria',
      email: 'coordinator@actionaid.org.ng',
      phone: '+234-812-345-6789',
      performanceScore: 95,
      commitments: [],
      achievements: [],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-08-20'),
    },
    responseType: ResponseType.FOOD,
    quantity: 500,
    unit: 'kg',
    targetDate: new Date('2024-09-15'),
    status: CommitmentStatus.PLANNED,
    incidentId: '1',
    affectedEntityId: 'entity-1',
    notes: 'Rice and beans for flood victims',
    createdAt: new Date('2024-08-20'),
    updatedAt: new Date('2024-08-20'),
  },
  {
    id: 'c5',
    donorId: '1',
    donor: {
      id: '1',
      name: 'ActionAid Nigeria',
      organization: 'ActionAid Nigeria',
      email: 'coordinator@actionaid.org.ng',
      phone: '+234-812-345-6789',
      performanceScore: 95,
      commitments: [],
      achievements: [],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-08-20'),
    },
    responseType: ResponseType.WASH,
    quantity: 100,
    unit: 'units',
    targetDate: new Date('2024-09-25'),
    status: CommitmentStatus.IN_PROGRESS,
    incidentId: '1',
    affectedEntityId: 'entity-2',
    notes: 'Water purification tablets and soap',
    createdAt: new Date('2024-08-18'),
    updatedAt: new Date('2024-08-22'),
  }
];

const mockAchievements: DonorAchievement[] = [
  {
    id: 'a1',
    donorId: '1',
    commitmentId: 'c_completed_1',
    responseType: ResponseType.FOOD,
    quantityDelivered: 300,
    unit: 'kg',
    deliveryDate: new Date('2024-07-15'),
    incidentId: 'prev-incident-1',
    affectedEntityId: 'prev-entity-1',
    verificationStatus: 'VERIFIED',
    performanceScore: 98,
    notes: 'Delivered ahead of schedule with excellent quality',
    createdAt: new Date('2024-07-15'),
    updatedAt: new Date('2024-07-16'),
  },
  {
    id: 'a2',
    donorId: '1',
    commitmentId: 'c_completed_2',
    responseType: ResponseType.HEALTH,
    quantityDelivered: 50,
    unit: 'kits',
    deliveryDate: new Date('2024-06-20'),
    incidentId: 'prev-incident-2',
    affectedEntityId: 'prev-entity-2',
    verificationStatus: 'VERIFIED',
    performanceScore: 92,
    notes: 'Medical supplies delivered as planned',
    createdAt: new Date('2024-06-20'),
    updatedAt: new Date('2024-06-21'),
  }
];

// GET /api/v1/donors/[id]/commitments - Get donor's commitments and achievements
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const donorId = params.id;
    const { searchParams } = new URL(request.url);
    
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const status = searchParams.get('status') as CommitmentStatus;
    const responseType = searchParams.get('responseType') as ResponseType;
    const incidentId = searchParams.get('incidentId');
    
    // Filter commitments for this donor
    let donorCommitments = mockCommitments.filter(c => c.donorId === donorId);
    
    // Apply status filter
    if (status) {
      donorCommitments = donorCommitments.filter(c => c.status === status);
    }
    
    // Apply response type filter
    if (responseType) {
      donorCommitments = donorCommitments.filter(c => c.responseType === responseType);
    }
    
    // Apply incident filter
    if (incidentId) {
      donorCommitments = donorCommitments.filter(c => c.incidentId === incidentId);
    }

    // Get achievements if requested
    let donorAchievements: DonorAchievement[] = [];
    if (includeHistory) {
      donorAchievements = mockAchievements.filter(a => a.donorId === donorId);
    }

    // Calculate summary stats
    const totalCommitments = donorCommitments.length;
    const plannedCommitments = donorCommitments.filter(c => c.status === CommitmentStatus.PLANNED).length;
    const inProgressCommitments = donorCommitments.filter(c => c.status === CommitmentStatus.IN_PROGRESS).length;
    const completedCommitments = donorCommitments.filter(c => c.status === CommitmentStatus.DELIVERED).length;
    
    const commitmentsByType = Object.values(ResponseType).reduce((acc, type) => {
      acc[type] = donorCommitments.filter(c => c.responseType === type).length;
      return acc;
    }, {} as Record<ResponseType, number>);

    const avgPerformanceScore = donorAchievements.length > 0 
      ? donorAchievements.reduce((sum, a) => sum + a.performanceScore, 0) / donorAchievements.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        donorId,
        commitments: donorCommitments,
        achievements: includeHistory ? donorAchievements : [],
        summary: {
          totalCommitments,
          plannedCommitments,
          inProgressCommitments,
          completedCommitments,
          commitmentsByType,
          totalAchievements: donorAchievements.length,
          avgPerformanceScore: Math.round(avgPerformanceScore),
        }
      },
      message: `Found ${totalCommitments} commitments for donor ${donorId}`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch donor commitments:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch donor commitments',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST /api/v1/donors/[id]/commitments - Create new commitment for donor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const donorId = params.id;
    const body = await request.json();

    // Validate required fields
    if (!body.responseType || !body.quantity || !body.unit || !body.targetDate || !body.incidentId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Response type, quantity, unit, target date, and incident ID are required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate response type
    if (!Object.values(ResponseType).includes(body.responseType)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid response type',
        message: `Response type must be one of: ${Object.values(ResponseType).join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Validate donor exists
    // 2. Validate incident exists
    // 3. Check donor capacity and previous commitments
    // 4. Save to database
    // 5. Create coordination workspace entry
    // 6. Send notifications to relevant stakeholders

    const newCommitment: DonorCommitment = {
      id: `c_${Date.now()}`,
      donorId,
      donor: {
        id: donorId,
        name: body.donorName || 'Unknown Donor',
        organization: body.donorOrganization || 'Unknown Organization',
        email: body.donorEmail || '',
        performanceScore: 50,
        commitments: [],
        achievements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      responseType: body.responseType,
      quantity: body.quantity,
      unit: body.unit,
      targetDate: new Date(body.targetDate),
      status: CommitmentStatus.PLANNED,
      incidentId: body.incidentId,
      affectedEntityId: body.affectedEntityId,
      notes: body.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: {
        commitment: newCommitment,
      },
      message: 'Commitment created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create commitment:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create commitment',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// PUT /api/v1/donors/[id]/commitments - Update existing commitment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const donorId = params.id;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const commitmentId = searchParams.get('commitmentId');

    if (!commitmentId) {
      return NextResponse.json({
        success: false,
        error: 'Missing commitment ID',
        message: 'Commitment ID is required in query parameters',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Find existing commitment
    const commitmentIndex = mockCommitments.findIndex(
      c => c.id === commitmentId && c.donorId === donorId
    );

    if (commitmentIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Commitment not found',
        message: `Commitment ${commitmentId} not found for donor ${donorId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Validate update data
    const existingCommitment = mockCommitments[commitmentIndex];
    const updates: Partial<DonorCommitment> = {};

    if (body.quantity !== undefined) {
      if (body.quantity < 1 || body.quantity > 999999) {
        return NextResponse.json({
          success: false,
          error: 'Invalid quantity',
          message: 'Quantity must be between 1 and 999,999',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      updates.quantity = body.quantity;
    }

    if (body.unit !== undefined) {
      if (!body.unit || body.unit.length > 50) {
        return NextResponse.json({
          success: false,
          error: 'Invalid unit',
          message: 'Unit is required and cannot exceed 50 characters',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      updates.unit = body.unit;
    }

    if (body.targetDate !== undefined) {
      const targetDate = new Date(body.targetDate);
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 1);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);

      if (targetDate < minDate || targetDate > maxDate) {
        return NextResponse.json({
          success: false,
          error: 'Invalid target date',
          message: 'Target date must be between tomorrow and one year from now',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      updates.targetDate = targetDate;
    }

    if (body.status !== undefined) {
      if (!['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'].includes(body.status)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid status',
          message: 'Status must be PLANNED, IN_PROGRESS, DELIVERED, or CANCELLED',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.notes !== undefined) {
      if (body.notes && body.notes.length > 500) {
        return NextResponse.json({
          success: false,
          error: 'Notes too long',
          message: 'Notes cannot exceed 500 characters',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      updates.notes = body.notes;
    }

    // Update commitment
    const updatedCommitment = {
      ...existingCommitment,
      ...updates,
      updatedAt: new Date(),
    };

    mockCommitments[commitmentIndex] = updatedCommitment;

    return NextResponse.json({
      success: true,
      data: {
        commitment: updatedCommitment,
      },
      message: 'Commitment updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update commitment:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update commitment',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// DELETE /api/v1/donors/[id]/commitments - Cancel/delete commitment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const donorId = params.id;
    const { searchParams } = new URL(request.url);
    const commitmentId = searchParams.get('commitmentId');
    const reason = searchParams.get('reason') || 'No reason provided';

    if (!commitmentId) {
      return NextResponse.json({
        success: false,
        error: 'Missing commitment ID',
        message: 'Commitment ID is required in query parameters',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Find existing commitment
    const commitmentIndex = mockCommitments.findIndex(
      c => c.id === commitmentId && c.donorId === donorId
    );

    if (commitmentIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Commitment not found',
        message: `Commitment ${commitmentId} not found for donor ${donorId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    const commitment = mockCommitments[commitmentIndex];

    // Check if commitment can be cancelled
    if (commitment.status === 'DELIVERED') {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel delivered commitment',
        message: 'Commitments that have been delivered cannot be cancelled',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Update status to CANCELLED instead of actually deleting
    const cancelledCommitment = {
      ...commitment,
      status: 'CANCELLED' as const,
      notes: `${commitment.notes || ''}\n\nCancelled: ${reason}`.trim(),
      updatedAt: new Date(),
    };

    mockCommitments[commitmentIndex] = cancelledCommitment;

    return NextResponse.json({
      success: true,
      data: {
        commitment: cancelledCommitment,
        cancellationReason: reason,
      },
      message: 'Commitment cancelled successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to cancel commitment:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel commitment',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
