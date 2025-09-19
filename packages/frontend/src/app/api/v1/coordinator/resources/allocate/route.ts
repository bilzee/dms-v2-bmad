import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { 
  ResponseType,
  ResourceAllocation,
  ResourceAllocationRequest,
  AllocationConflict 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Helper function to get allocations from database
async function getAllocationsFromDB(filters: any = {}): Promise<ResourceAllocation[]> {
  const responses = await prisma.rapidResponse.findMany({
    where: {
      ...filters,
      donorCommitments: {
        some: {}
      }
    },
    include: {
      donorCommitments: {
        include: {
          donor: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return responses.map(r => {
    const responseData = r.data as any;
    const commitment = r.donorCommitments[0]; // Primary commitment
    
    return {
      id: r.id,
      responseType: r.responseType as ResponseType,
      quantity: responseData?.quantity || 0,
      unit: responseData?.unit || 'units',
      affectedEntityId: r.affectedEntityId,
      affectedEntityName: responseData?.affectedEntityName || 'Unknown Entity',
      donorCommitmentId: commitment?.id,
      donorName: commitment?.donor?.name,
      priority: responseData?.priority || 'MEDIUM',
      targetDate: r.plannedDate,
      status: r.status as any,
      coordinatorId: r.responderId, // Using responderId as coordinator for now
      coordinatorName: r.responderName,
      notes: responseData?.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  });
}

// Helper function to create allocation in database
async function createAllocationInDB(request: ResourceAllocationRequest, coordinatorId: string): Promise<ResourceAllocation> {
  // Get user info for coordinator details
  const coordinator = await prisma.user.findUnique({
    where: { id: coordinatorId }
  });

  // Get affected entity
  const affectedEntity = await prisma.affectedEntity.findUnique({
    where: { id: request.affectedEntityId }
  });

  // Create rapid response record for the allocation
  const rapidResponse = await prisma.rapidResponse.create({
    data: {
      responseType: request.responseType,
      status: 'PLANNED',
      plannedDate: request.targetDate ? new Date(request.targetDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      affectedEntityId: request.affectedEntityId,
      responderId: coordinatorId,
      responderName: coordinator?.name || 'Coordinator',
      donorId: request.preferredDonorId,
      donorName: request.preferredDonorName,
      verificationStatus: 'PENDING',
      data: {
        quantity: request.quantity,
        unit: request.unit || 'units',
        priority: request.priority,
        notes: request.notes,
        affectedEntityName: affectedEntity?.name || request.affectedEntityName || 'Unknown Entity',
        coordinatorId,
        coordinatorName: coordinator?.name || 'Coordinator'
      }
    },
    include: {
      donorCommitments: {
        include: {
          donor: true
        }
      }
    }
  });

  // If preferred donor specified, create commitment link
  if (request.preferredDonorId) {
    await prisma.donorCommitment.create({
      data: {
        donorId: request.preferredDonorId,
        responseType: request.responseType,
        quantity: request.quantity,
        unit: request.unit || 'units',
        targetDate: request.targetDate ? new Date(request.targetDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PLANNED',
        affectedEntityId: request.affectedEntityId,
        rapidResponseId: rapidResponse.id,
        notes: request.notes
      }
    });
  }

  const responseData = rapidResponse.data as any;
  
  return {
    id: rapidResponse.id,
    responseType: rapidResponse.responseType as ResponseType,
    quantity: responseData.quantity,
    unit: responseData.unit,
    affectedEntityId: rapidResponse.affectedEntityId,
    affectedEntityName: responseData.affectedEntityName,
    donorCommitmentId: undefined,
    donorName: rapidResponse.donorName || undefined,
    priority: responseData.priority,
    targetDate: rapidResponse.plannedDate,
    status: rapidResponse.status as any,
    coordinatorId: responseData.coordinatorId,
    coordinatorName: responseData.coordinatorName,
    notes: responseData.notes,
    createdAt: rapidResponse.createdAt,
    updatedAt: rapidResponse.updatedAt
  };
}

// POST /api/v1/coordinator/resources/allocate - Create new resource allocation
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const body: ResourceAllocationRequest = await request.json();

    // Validate required fields
    if (!body.responseType || !body.quantity || !body.affectedEntityId || !body.priority) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Missing required fields'],
        message: 'Response type, quantity, affected entity ID, and priority are required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate response type
    if (!Object.values(ResponseType).includes(body.responseType)) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid response type'],
        message: `Response type must be one of: ${Object.values(ResponseType).join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate priority
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(body.priority)) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid priority level'],
        message: 'Priority must be HIGH, MEDIUM, or LOW',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Real conflict detection using database
    const conflicts: AllocationConflict[] = [];
    
    // Check for timing conflicts
    const existingAllocations = await getAllocationsFromDB({
      affectedEntityId: body.affectedEntityId,
      responseType: body.responseType,
      status: { not: 'CANCELLED' }
    });
    
    if (existingAllocations.length > 0 && body.targetDate) {
      const requestDate = new Date(body.targetDate);
      const conflictingAllocation = existingAllocations.find(a => {
        const allocDate = new Date(a.targetDate);
        const daysDiff = Math.abs((requestDate.getTime() - allocDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff < 2; // Within 2 days
      });
      
      if (conflictingAllocation) {
        conflicts.push({
          type: 'TIMING_CONFLICT',
          description: 'Another allocation exists within 2 days of requested date',
          conflictingAllocationId: conflictingAllocation.id,
          severity: 'MEDIUM',
          suggestion: 'Consider adjusting the target date or coordinating with existing allocation'
        });
      }
    }

    // Check for quantity availability using real commitments
    const commitments = await prisma.donorCommitment.findMany({
      where: { responseType: body.responseType },
      select: { quantity: true }
    });
    
    const totalCommitted = commitments.reduce((sum, c) => sum + c.quantity, 0);
    const totalAllocated = existingAllocations
      .filter(a => a.responseType === body.responseType)
      .reduce((sum, a) => sum + a.quantity, 0);
    
    const availableQuantity = totalCommitted - totalAllocated;
    
    if (body.quantity > availableQuantity) {
      conflicts.push({
        type: 'QUANTITY_SHORTAGE',
        description: `Requested quantity (${body.quantity}) exceeds available resources (${availableQuantity})`,
        severity: 'HIGH',
        suggestion: 'Reduce quantity or secure additional commitments from donors'
      });
    }

    // If there are high-severity conflicts, return them for coordinator review
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'HIGH');
    if (highSeverityConflicts.length > 0 && !body.overrideConflicts) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Allocation conflicts detected'],
        conflicts: highSeverityConflicts,
        message: 'Please review conflicts and resubmit with overrideConflicts=true if needed',
        timestamp: new Date().toISOString(),
      }, { status: 409 });
    }

    // Create the allocation in database
    const newAllocation = await createAllocationInDB(body, session.user.id);

    // Get real donor suggestions based on performance and availability
    const donorSuggestions = await prisma.donor.findMany({
      where: {
        isActive: true,
        commitments: {
          some: {
            responseType: body.responseType,
            status: { in: ['PLANNED', 'IN_PROGRESS'] }
          }
        }
      },
      select: {
        id: true,
        name: true,
        performanceScore: true,
        commitments: {
          where: {
            responseType: body.responseType,
            status: { in: ['PLANNED', 'IN_PROGRESS'] }
          },
          select: {
            quantity: true,
            targetDate: true
          }
        }
      },
      orderBy: { performanceScore: 'desc' },
      take: 3
    }).then(donors => donors.map(donor => {
      const availableQuantity = donor.commitments.reduce((sum, c) => sum + c.quantity, 0);
      const avgDeliveryDays = donor.commitments.length > 0 ? 
        donor.commitments.reduce((sum, c) => sum + Math.ceil((c.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0) / donor.commitments.length : 7;
      
      return {
        donorId: donor.id,
        donorName: donor.name,
        availableQuantity,
        deliveryTimeframe: `${Math.max(1, Math.floor(avgDeliveryDays))}-${Math.ceil(avgDeliveryDays + 2)} days`,
        performanceScore: Math.round(donor.performanceScore),
        matchScore: Math.round(donor.performanceScore * 0.9 + (availableQuantity >= body.quantity ? 10 : 0)),
        reasons: [
          ...(donor.performanceScore > 90 ? ['High performance score'] : []),
          ...(avgDeliveryDays <= 5 ? ['Quick delivery'] : []),
          ...(availableQuantity >= body.quantity ? ['Sufficient quantity'] : [])
        ]
      };
    }));

    return NextResponse.json({
      success: true,
      data: {
        allocation: newAllocation,
        donorSuggestions: body.responseType === ResponseType.FOOD ? donorSuggestions : [],
        conflicts: conflicts.filter(c => c.severity !== 'HIGH'),
        workspaceEntries: [
          {
            id: `ws-${Date.now()}`,
            type: 'ALLOCATION_CREATED',
            description: `New ${body.responseType.toLowerCase()} allocation created for ${body.affectedEntityName}`,
            priority: body.priority,
            assignedTo: 'current-coordinator-id',
            dueDate: body.targetDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'PENDING',
          }
        ]
      },
      message: 'Resource allocation created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create resource allocation:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid JSON in request body'],
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to create resource allocation'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET /api/v1/coordinator/resources/allocate - Get existing allocations
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const affectedEntityId = searchParams.get('affectedEntityId');
    const responseType = searchParams.get('responseType') as ResponseType;
    const status = searchParams.get('status') as 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    const priority = searchParams.get('priority') as 'HIGH' | 'MEDIUM' | 'LOW';
    const coordinatorId = searchParams.get('coordinatorId');
    
    // Build filters for database query
    const filters: any = {};
    if (affectedEntityId) filters.affectedEntityId = affectedEntityId;
    if (responseType) filters.responseType = responseType;
    if (status) filters.status = status;
    if (coordinatorId) filters.responderId = coordinatorId;
    
    let filteredAllocations = await getAllocationsFromDB(filters);
    
    // Apply priority filter (not included in main query)
    if (priority) {
      filteredAllocations = filteredAllocations.filter(a => a.priority === priority);
    }

    // Calculate summary statistics
    const totalAllocations = filteredAllocations.length;
    const pendingAllocations = filteredAllocations.filter(a => a.status === 'PENDING').length;
    const highPriorityAllocations = filteredAllocations.filter(a => a.priority === 'HIGH').length;
    
    const allocationsByType = Object.values(ResponseType).reduce((acc, type) => {
      acc[type] = filteredAllocations.filter(a => a.responseType === type).length;
      return acc;
    }, {} as Record<ResponseType, number>);
    
    const allocationsByStatus = {
      PENDING: filteredAllocations.filter(a => a.status === 'PENDING').length,
      CONFIRMED: filteredAllocations.filter(a => a.status === 'CONFIRMED').length,
      IN_PROGRESS: filteredAllocations.filter(a => a.status === 'IN_PROGRESS').length,
      COMPLETED: filteredAllocations.filter(a => a.status === 'COMPLETED').length,
      CANCELLED: filteredAllocations.filter(a => a.status === 'CANCELLED').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        allocations: filteredAllocations,
        summary: {
          totalAllocations,
          pendingAllocations,
          highPriorityAllocations,
          allocationsByType,
          allocationsByStatus,
        }
      },
      message: `Found ${totalAllocations} allocations`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch allocations:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch allocations'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
