import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const responseTypes = ['SUPPLIES', 'SHELTER', 'MEDICAL', 'EVACUATION', 'SECURITY', 'OTHER'] as const;
const responseStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
const verificationStatuses = ['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED'] as const;
const entityTypes = ['CAMP', 'COMMUNITY'] as const;

// Mock detailed response data generator
const generateDetailedResponses = (filters: any = {}) => {
  const responses = [];
  const count = Math.floor(Math.random() * 40) + 15; // 15-55 responses
  
  for (let i = 0; i < count; i++) {
    const responseType = responseTypes[Math.floor(Math.random() * responseTypes.length)];
    const status = responseStatuses[Math.floor(Math.random() * responseStatuses.length)];
    const verificationStatus = verificationStatuses[Math.floor(Math.random() * verificationStatuses.length)];
    const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
    
    const plannedDate = new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000); // Last 20 days
    const deliveredDate = status === 'COMPLETED' ? 
      new Date(plannedDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) : undefined; // Within 5 days of planned
    
    const response = {
      id: `RESP-${String(i + 1).padStart(4, '0')}`,
      responseType,
      status,
      plannedDate,
      deliveredDate,
      responderName: `Responder ${Math.floor(Math.random() * 8) + 1}`,
      entityName: `${entityType === 'CAMP' ? 'Camp' : 'Community'} ${Math.floor(Math.random() * 100) + 1}`,
      entityType,
      coordinates: {
        latitude: 9.0 + Math.random() * 2,
        longitude: 7.0 + Math.random() * 7,
      },
      assessmentType: ['GENERAL', 'SHELTER', 'HEALTHCARE', 'EDUCATION', 'WASH', 'LIVELIHOOD'][Math.floor(Math.random() * 6)],
      donorName: Math.random() > 0.4 ? `Donor ${Math.floor(Math.random() * 5) + 1}` : undefined,
      dataDetails: {
        // Polymorphic response data based on type
        ...(responseType === 'SUPPLIES' && {
          itemsDelivered: [
            { item: 'Food Packages', quantity: Math.floor(Math.random() * 100) + 50, unit: 'packages' },
            { item: 'Water Containers', quantity: Math.floor(Math.random() * 50) + 20, unit: 'containers' },
            { item: 'Blankets', quantity: Math.floor(Math.random() * 200) + 100, unit: 'pieces' },
          ],
          totalBeneficiaries: Math.floor(Math.random() * 500) + 100,
        }),
        ...(responseType === 'MEDICAL' && {
          patientsHelped: Math.floor(Math.random() * 50) + 10,
          medicinesDistributed: Math.floor(Math.random() * 100) + 20,
          medicalTeamSize: Math.floor(Math.random() * 10) + 3,
        }),
        ...(responseType === 'SHELTER' && {
          temporaryShelters: Math.floor(Math.random() * 50) + 10,
          familiesHelped: Math.floor(Math.random() * 100) + 30,
          materialUsed: 'Tarpaulins, poles, ropes',
        }),
      },
      deliveryItems: [
        { item: 'Primary Resource', quantity: Math.floor(Math.random() * 100) + 10, unit: 'units' },
        { item: 'Secondary Resource', quantity: Math.floor(Math.random() * 50) + 5, unit: 'units' },
      ],
      evidenceCount: Math.floor(Math.random() * 6),
      verificationStatus,
    };
    
    // Apply filters
    if (filters.incidentIds && filters.incidentIds.length > 0) {
      // Filter by incident (would be linked via assessment)
      if (Math.random() > 0.7) continue; // Mock filter
    }
    
    if (filters.entityIds && filters.entityIds.length > 0) {
      if (!filters.entityIds.some((id: string) => response.entityName.includes(id))) {
        continue;
      }
    }
    
    if (filters.responseTypes && filters.responseTypes.length > 0) {
      if (!filters.responseTypes.includes(response.responseType)) {
        continue;
      }
    }
    
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(response.status)) {
        continue;
      }
    }
    
    if (filters.timeframe) {
      const responseDate = new Date(response.plannedDate);
      if (responseDate < new Date(filters.timeframe.start) || responseDate > new Date(filters.timeframe.end)) {
        continue;
      }
    }
    
    responses.push(response);
  }
  
  return responses;
};

// GET /api/v1/monitoring/drill-down/responses - Get detailed response data with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const incidentIds = searchParams.get('incidentIds')?.split(',').filter(Boolean);
    const entityIds = searchParams.get('entityIds')?.split(',').filter(Boolean);
    const responseTypes = searchParams.get('responseTypes')?.split(',').filter(Boolean);
    const status = searchParams.get('status')?.split(',').filter(Boolean);
    const timeframeStart = searchParams.get('timeframeStart');
    const timeframeEnd = searchParams.get('timeframeEnd');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const filters = {
      incidentIds,
      entityIds,
      responseTypes,
      status,
      timeframe: timeframeStart && timeframeEnd ? {
        start: timeframeStart,
        end: timeframeEnd,
      } : undefined,
    };
    
    const allResponses = generateDetailedResponses(filters);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResponses = allResponses.slice(startIndex, endIndex);
    
    // Generate aggregations
    const aggregations = {
      byType: responseTypes.reduce((acc, type) => {
        acc[type] = allResponses.filter(r => r.responseType === type).length;
        return acc;
      }, {} as Record<string, number>),
      byStatus: responseStatuses.reduce((acc, status) => {
        acc[status] = allResponses.filter(r => r.status === status).length;
        return acc;
      }, {} as Record<string, number>),
      byEntity: allResponses.reduce((acc, response) => {
        acc[response.entityName] = (acc[response.entityName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byVerification: verificationStatuses.reduce((acc, status) => {
        acc[status] = allResponses.filter(r => r.verificationStatus === status).length;
        return acc;
      }, {} as Record<string, number>),
    };
    
    const response = {
      success: true,
      data: paginatedResponses,
      meta: {
        filters,
        totalRecords: allResponses.length,
        page,
        limit,
        totalPages: Math.ceil(allResponses.length / limit),
        aggregations,
        exportToken: `export-responses-${Date.now()}`,
        lastUpdate: new Date().toISOString(),
      },
      message: 'Detailed response data retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch detailed responses:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch detailed responses',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}