import { NextRequest, NextResponse } from 'next/server';
import { 
  DonorCommitment, 
  DonorAchievement,
  ResponseType,
  CommitmentStatus 
} from '@dms/shared';

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