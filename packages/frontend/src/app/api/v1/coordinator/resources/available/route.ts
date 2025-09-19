import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { 
  ResponseType,
  ResourceAvailability,
  ResourceAvailabilityFilters 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Helper function to calculate resource availability from database
async function getResourceAvailabilityFromDB(incidentId?: string): Promise<ResourceAvailability[]> {
  // Get all donor commitments with filtering
  const commitments = await prisma.donorCommitment.findMany({
    where: incidentId ? { incidentId } : {},
    include: {
      donor: true,
      rapidResponse: true
    },
    orderBy: { targetDate: 'asc' }
  });

  // Get responses to understand allocations
  const responses = await prisma.rapidResponse.findMany({
    where: incidentId ? {
      donorCommitments: {
        some: { incidentId }
      }
    } : {},
    include: {
      donorCommitments: true
    }
  });

  // Get affected entities for allocation mapping
  const affectedEntities = await prisma.affectedEntity.findMany({
    where: incidentId ? { incidentId } : {},
    select: {
      id: true,
      name: true,
      type: true
    }
  });

  // Group by response type
  const responseTypes = Object.values(ResponseType);
  const resourceAvailability: ResourceAvailability[] = [];

  for (const responseType of responseTypes) {
    const typeCommitments = commitments.filter(c => c.responseType === responseType);
    const typeResponses = responses.filter(r => r.responseType === responseType);
    
    // Calculate totals
    const totalCommitted = typeCommitments.reduce((sum, c) => sum + c.quantity, 0);
    const totalAllocated = typeResponses.reduce((sum, r) => {
      const responseData = r.data as any;
      return sum + (responseData?.quantity || 0);
    }, 0);
    const totalAvailable = Math.max(0, totalCommitted - totalAllocated);
    
    // Map commitments
    const mappedCommitments = typeCommitments.map(c => ({
      donorId: c.donorId,
      donorName: c.donor.name,
      quantity: c.quantity,
      targetDate: c.targetDate,
      status: c.status as any,
      incidentId: c.incidentId || ''
    }));

    // Map allocations from responses
    const mappedAllocations = typeResponses.map(r => {
      const responseData = r.data as any;
      const entity = affectedEntities.find(e => e.id === r.affectedEntityId);
      return {
        affectedEntityId: r.affectedEntityId,
        affectedEntityName: entity?.name || 'Unknown Entity',
        quantity: responseData?.quantity || 0,
        priority: responseData?.priority || 'MEDIUM',
        targetDate: r.plannedDate
      };
    });

    // Calculate shortfall
    const totalNeeded = mappedAllocations.reduce((sum, a) => sum + a.quantity, 0);
    const projectedShortfall = Math.max(0, totalNeeded - totalCommitted);

    // Find earliest available date
    const earliestAvailable = typeCommitments.length > 0 
      ? new Date(Math.min(...typeCommitments.map(c => c.targetDate.getTime())))
      : new Date();

    // Determine unit based on response type
    const getUnit = (type: ResponseType): string => {
      switch (type) {
        case ResponseType.FOOD: return 'kg';
        case ResponseType.WASH: return 'units';
        case ResponseType.HEALTH: return 'kits';
        case ResponseType.SHELTER: return 'tarpaulins';
        case ResponseType.SECURITY: return 'units';
        case ResponseType.POPULATION: return 'persons';
        default: return 'units';
      }
    };

    resourceAvailability.push({
      responseType,
      totalCommitted,
      totalAllocated,
      totalAvailable,
      unit: getUnit(responseType),
      commitments: mappedCommitments,
      allocations: mappedAllocations,
      projectedShortfall,
      earliestAvailable,
      lastUpdated: new Date()
    });
  }

  return resourceAvailability.filter(r => r.totalCommitted > 0 || r.totalAllocated > 0);
}

// GET /api/v1/coordinator/resources/available - Get resource availability overview
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
    
    // Parse query parameters
    const incidentId = searchParams.get('incidentId');
    const responseTypes = searchParams.get('responseTypes')?.split(',') as ResponseType[];
    const priorityFilter = searchParams.get('priorityFilter') as 'HIGH' | 'MEDIUM' | 'LOW';
    const showShortfalls = searchParams.get('showShortfalls') === 'true';
    const minQuantity = parseInt(searchParams.get('minQuantity') || '0');
    
    // Get real resource availability from database
    let filteredResources = await getResourceAvailabilityFromDB(incidentId || undefined);
    
    // Filter by response types if specified
    if (responseTypes && responseTypes.length > 0) {
      filteredResources = filteredResources.filter(resource =>
        responseTypes.includes(resource.responseType)
      );
    }
    
    // Filter by priority if specified
    if (priorityFilter) {
      filteredResources = filteredResources.filter(resource =>
        resource.allocations.some(allocation => allocation.priority === priorityFilter)
      );
    }
    
    // Filter by shortfalls only if requested
    if (showShortfalls) {
      filteredResources = filteredResources.filter(resource =>
        resource.projectedShortfall > 0
      );
    }
    
    // Filter by minimum available quantity
    if (minQuantity > 0) {
      filteredResources = filteredResources.filter(resource =>
        resource.totalAvailable >= minQuantity
      );
    }
    
    // Filter by incident if specified
    if (incidentId) {
      filteredResources = filteredResources.map(resource => ({
        ...resource,
        commitments: resource.commitments.filter(c => c.incidentId === incidentId),
        // Recalculate totals for this incident
        totalCommitted: resource.commitments
          .filter(c => c.incidentId === incidentId)
          .reduce((sum, c) => sum + c.quantity, 0),
      }));
    }

    // Calculate summary statistics
    const totalResourceTypes = filteredResources.length;
    const resourcesWithShortfalls = filteredResources.filter(r => r.projectedShortfall > 0).length;
    const resourcesFullyAllocated = filteredResources.filter(r => r.totalAvailable === 0).length;
    const totalCommitments = filteredResources.reduce((sum, r) => sum + r.commitments.length, 0);
    const totalAllocations = filteredResources.reduce((sum, r) => sum + r.allocations.length, 0);
    
    const criticalShortfalls = filteredResources
      .filter(r => r.projectedShortfall > (r.totalCommitted * 0.2)) // >20% shortfall
      .map(r => ({
        responseType: r.responseType,
        shortfall: r.projectedShortfall,
        unit: r.unit,
        percentage: Math.round((r.projectedShortfall / (r.totalCommitted + r.projectedShortfall)) * 100)
      }));

    const upcomingDeadlines = filteredResources
      .flatMap(r => r.allocations.map(a => ({
        responseType: r.responseType,
        affectedEntityName: a.affectedEntityName,
        quantity: a.quantity,
        unit: r.unit,
        targetDate: a.targetDate,
        priority: a.priority,
        daysUntilDeadline: Math.ceil(
          (new Date(a.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
      })))
      .filter(d => d.daysUntilDeadline <= 7 && d.daysUntilDeadline >= 0)
      .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        resources: filteredResources,
        summary: {
          totalResourceTypes,
          resourcesWithShortfalls,
          resourcesFullyAllocated,
          totalCommitments,
          totalAllocations,
          criticalShortfalls,
          upcomingDeadlines,
        },
        filters: {
          availableResponseTypes: Object.values(ResponseType),
          availablePriorities: ['HIGH', 'MEDIUM', 'LOW'],
          incidentId,
        },
      },
      message: `Found ${totalResourceTypes} resource types with availability data`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch resource availability:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch resource availability'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
