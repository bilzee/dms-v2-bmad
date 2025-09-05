import { NextRequest, NextResponse } from 'next/server';
import { 
  ResponseType,
  ResourceAllocation,
  ResourceAllocationRequest,
  AllocationConflict 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock allocation tracking - would be replaced with database
const mockAllocations: ResourceAllocation[] = [
  {
    id: 'alloc-1',
    responseType: ResponseType.FOOD,
    quantity: 300,
    unit: 'kg',
    affectedEntityId: 'entity-1',
    affectedEntityName: 'Maiduguri IDP Camp',
    donorCommitmentId: 'c1',
    donorName: 'ActionAid Nigeria',
    priority: 'HIGH',
    targetDate: new Date('2024-09-10'),
    status: 'PENDING',
    coordinatorId: 'coord-1',
    coordinatorName: 'John Coordinator',
    notes: 'Urgent need for flood victims',
    createdAt: new Date('2024-08-25'),
    updatedAt: new Date('2024-08-25'),
  },
];

// POST /api/v1/coordinator/resources/allocate - Create new resource allocation
export async function POST(request: NextRequest) {
  try {
    const body: ResourceAllocationRequest = await request.json();

    // Validate required fields
    if (!body.responseType || !body.quantity || !body.affectedEntityId || !body.priority) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Response type, quantity, affected entity ID, and priority are required',
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

    // Validate priority
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(body.priority)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid priority level',
        message: 'Priority must be HIGH, MEDIUM, or LOW',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Check resource availability against commitments
    // 2. Validate affected entity exists
    // 3. Check for allocation conflicts
    // 4. Calculate optimal donor matching
    // 5. Create coordination workspace entries
    // 6. Send notifications to donors and responders
    // 7. Update resource tracking

    // Mock conflict detection
    const conflicts: AllocationConflict[] = [];
    
    // Check for timing conflicts
    const existingAllocations = mockAllocations.filter(
      a => a.affectedEntityId === body.affectedEntityId && 
           a.responseType === body.responseType &&
           a.status !== 'CANCELLED'
    );
    
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

    // Check for quantity availability (simplified check)
    const totalAllocated = existingAllocations
      .filter(a => a.responseType === body.responseType)
      .reduce((sum, a) => sum + a.quantity, 0);
    
    const mockCommittedQuantity = 1000; // Would come from actual commitments
    const availableQuantity = mockCommittedQuantity - totalAllocated;
    
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
        error: 'Allocation conflicts detected',
        conflicts: highSeverityConflicts,
        message: 'Please review conflicts and resubmit with overrideConflicts=true if needed',
        timestamp: new Date().toISOString(),
      }, { status: 409 });
    }

    // Create the allocation
    const newAllocation: ResourceAllocation = {
      id: `alloc-${Date.now()}`,
      responseType: body.responseType,
      quantity: body.quantity,
      unit: body.unit || 'units',
      affectedEntityId: body.affectedEntityId,
      affectedEntityName: body.affectedEntityName || 'Unknown Entity',
      donorCommitmentId: body.preferredDonorId ? `c_${body.preferredDonorId}` : undefined,
      donorName: body.preferredDonorName,
      priority: body.priority,
      targetDate: body.targetDate ? new Date(body.targetDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      coordinatorId: 'current-coordinator-id', // Would come from auth
      coordinatorName: 'Current Coordinator', // Would come from auth
      notes: body.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to mock storage
    mockAllocations.push(newAllocation);

    // Mock optimal donor matching suggestions
    const donorSuggestions = [
      {
        donorId: '1',
        donorName: 'ActionAid Nigeria',
        availableQuantity: 500,
        deliveryTimeframe: '3-5 days',
        performanceScore: 95,
        matchScore: 92,
        reasons: ['High performance score', 'Quick delivery', 'Sufficient quantity']
      },
      {
        donorId: '5',
        donorName: 'World Food Programme',
        availableQuantity: 700,
        deliveryTimeframe: '5-7 days',
        performanceScore: 94,
        matchScore: 88,
        reasons: ['Large quantity available', 'Excellent track record', 'Relevant expertise']
      }
    ];

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
        error: 'Invalid JSON in request body',
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create resource allocation',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET /api/v1/coordinator/resources/allocate - Get existing allocations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const affectedEntityId = searchParams.get('affectedEntityId');
    const responseType = searchParams.get('responseType') as ResponseType;
    const status = searchParams.get('status') as 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    const priority = searchParams.get('priority') as 'HIGH' | 'MEDIUM' | 'LOW';
    const coordinatorId = searchParams.get('coordinatorId');
    
    let filteredAllocations = [...mockAllocations];
    
    // Apply filters
    if (affectedEntityId) {
      filteredAllocations = filteredAllocations.filter(a => a.affectedEntityId === affectedEntityId);
    }
    
    if (responseType) {
      filteredAllocations = filteredAllocations.filter(a => a.responseType === responseType);
    }
    
    if (status) {
      filteredAllocations = filteredAllocations.filter(a => a.status === status);
    }
    
    if (priority) {
      filteredAllocations = filteredAllocations.filter(a => a.priority === priority);
    }
    
    if (coordinatorId) {
      filteredAllocations = filteredAllocations.filter(a => a.coordinatorId === coordinatorId);
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
      error: 'Failed to fetch allocations',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
