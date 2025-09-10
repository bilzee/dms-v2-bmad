import { NextRequest, NextResponse } from 'next/server';
import { 
  ResponseType,
  ResourceAvailability,
  ResourceAvailabilityFilters 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock resource availability data - would be calculated from database
const mockResourceAvailability: ResourceAvailability[] = [
  {
    responseType: ResponseType.FOOD,
    totalCommitted: 1200,
    totalAllocated: 800,
    totalAvailable: 400,
    unit: 'kg',
    commitments: [
      {
        donorId: '1',
        donorName: 'ActionAid Nigeria',
        quantity: 500,
        targetDate: new Date('2024-09-15'),
        status: 'PLANNED' as any,
        incidentId: '1',
      },
      {
        donorId: '5',
        donorName: 'World Food Programme',
        quantity: 700,
        targetDate: new Date('2024-09-12'),
        status: 'PLANNED' as any,
        incidentId: '1',
      }
    ],
    allocations: [
      {
        affectedEntityId: 'entity-1',
        affectedEntityName: 'Maiduguri IDP Camp',
        quantity: 300,
        priority: 'HIGH',
        targetDate: new Date('2024-09-10'),
      },
      {
        affectedEntityId: 'entity-2', 
        affectedEntityName: 'Bama Community Center',
        quantity: 500,
        priority: 'MEDIUM',
        targetDate: new Date('2024-09-15'),
      }
    ],
    projectedShortfall: 0,
    earliestAvailable: new Date('2024-09-12'),
    lastUpdated: new Date('2024-08-25'),
  },
  {
    responseType: ResponseType.WASH,
    totalCommitted: 400,
    totalAllocated: 350,
    totalAvailable: 50,
    unit: 'units',
    commitments: [
      {
        donorId: '2',
        donorName: 'Oxfam International',
        quantity: 200,
        targetDate: new Date('2024-09-10'),
        status: 'PLANNED' as any,
        incidentId: '1',
      },
      {
        donorId: '1',
        donorName: 'ActionAid Nigeria',
        quantity: 200,
        targetDate: new Date('2024-09-25'),
        status: 'IN_PROGRESS',
        incidentId: '1',
      }
    ],
    allocations: [
      {
        affectedEntityId: 'entity-1',
        affectedEntityName: 'Maiduguri IDP Camp',
        quantity: 200,
        priority: 'HIGH',
        targetDate: new Date('2024-09-08'),
      },
      {
        affectedEntityId: 'entity-3',
        affectedEntityName: 'Gubio Village',
        quantity: 150,
        priority: 'MEDIUM', 
        targetDate: new Date('2024-09-12'),
      }
    ],
    projectedShortfall: 100,
    earliestAvailable: new Date('2024-09-10'),
    lastUpdated: new Date('2024-08-25'),
  },
  {
    responseType: ResponseType.HEALTH,
    totalCommitted: 150,
    totalAllocated: 120,
    totalAvailable: 30,
    unit: 'kits',
    commitments: [
      {
        donorId: '3',
        donorName: 'Save the Children',
        quantity: 100,
        targetDate: new Date('2024-09-20'),
        status: 'DELIVERED',
        incidentId: '1',
      },
      {
        donorId: '4',
        donorName: 'UNICEF Nigeria',
        quantity: 50,
        targetDate: new Date('2024-09-18'),
        status: 'PLANNED' as any,
        incidentId: '1',
      }
    ],
    allocations: [
      {
        affectedEntityId: 'entity-2',
        affectedEntityName: 'Bama Community Center',
        quantity: 70,
        priority: 'HIGH',
        targetDate: new Date('2024-09-15'),
      },
      {
        affectedEntityId: 'entity-4',
        affectedEntityName: 'Konduga Health Center',
        quantity: 50,
        priority: 'MEDIUM',
        targetDate: new Date('2024-09-18'),
      }
    ],
    projectedShortfall: 0,
    earliestAvailable: new Date('2024-09-18'),
    lastUpdated: new Date('2024-08-25'),
  },
  {
    responseType: ResponseType.SHELTER,
    totalCommitted: 300,
    totalAllocated: 250,
    totalAvailable: 50,
    unit: 'tarpaulins',
    commitments: [
      {
        donorId: '4',
        donorName: 'UNICEF Nigeria',
        quantity: 300,
        targetDate: new Date('2024-09-12'),
        status: 'PLANNED' as any,
        incidentId: '1',
      }
    ],
    allocations: [
      {
        affectedEntityId: 'entity-1',
        affectedEntityName: 'Maiduguri IDP Camp',
        quantity: 150,
        priority: 'HIGH',
        targetDate: new Date('2024-09-10'),
      },
      {
        affectedEntityId: 'entity-5',
        affectedEntityName: 'Monguno Settlement',
        quantity: 100,
        priority: 'MEDIUM',
        targetDate: new Date('2024-09-12'),
      }
    ],
    projectedShortfall: 50,
    earliestAvailable: new Date('2024-09-12'),
    lastUpdated: new Date('2024-08-25'),
  }
];

// GET /api/v1/coordinator/resources/available - Get resource availability overview
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const incidentId = searchParams.get('incidentId');
    const responseTypes = searchParams.get('responseTypes')?.split(',') as ResponseType[];
    const priorityFilter = searchParams.get('priorityFilter') as 'HIGH' | 'MEDIUM' | 'LOW';
    const showShortfalls = searchParams.get('showShortfalls') === 'true';
    const minQuantity = parseInt(searchParams.get('minQuantity') || '0');
    
    let filteredResources = [...mockResourceAvailability];
    
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
