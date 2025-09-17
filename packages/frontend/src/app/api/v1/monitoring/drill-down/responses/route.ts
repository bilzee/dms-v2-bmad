import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Helper function to build where clause for responses
async function buildResponseWhereClause(filters: any) {
  const where: any = {};

  // Handle incident filtering - get affected entity IDs from incident
  if (filters.incidentIds && filters.incidentIds.length > 0) {
    const entitiesForIncidents = await DatabaseService.prisma.affectedEntity.findMany({
      where: { incidentId: { in: filters.incidentIds } },
      select: { id: true }
    });
    
    if (entitiesForIncidents.length > 0) {
      where.affectedEntityId = { 
        in: entitiesForIncidents.map(e => e.id) 
      };
    } else {
      // No entities found for these incidents, return empty where clause
      where.affectedEntityId = { in: [] };
    }
  }

  // Handle entity filtering
  if (filters.entityIds && filters.entityIds.length > 0) {
    if (where.affectedEntityId) {
      // If we already have a constraint from incident filtering, we need to intersect
      const existingIds = where.affectedEntityId.in || [];
      where.affectedEntityId.in = existingIds.filter((id: string) => filters.entityIds.includes(id));
    } else {
      where.affectedEntityId = { in: filters.entityIds };
    }
  }

  // Handle response type filtering
  if (filters.responseTypes && filters.responseTypes.length > 0) {
    where.responseType = { in: filters.responseTypes };
  }

  // Handle status filtering
  if (filters.status && filters.status.length > 0) {
    where.status = { in: filters.status };
  }

  // Handle timeframe filtering
  if (filters.timeframe) {
    where.plannedDate = {
      gte: new Date(filters.timeframe.start),
      lte: new Date(filters.timeframe.end)
    };
  }

  return where;
}

// Helper function to extract response-specific data based on response type
function extractResponseData(response: any) {
  const dataDetails: any = {
    responseType: response.responseType,
  };

  // Extract data based on response type
  if (response.data) {
    try {
      const parsedData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      
      if (response.responseType === 'SUPPLIES') {
        dataDetails.itemsDelivered = parsedData.itemsDelivered || [];
        dataDetails.totalBeneficiaries = parsedData.totalBeneficiaries || 0;
      } else if (response.responseType === 'MEDICAL') {
        dataDetails.patientsHelped = parsedData.patientsHelped || 0;
        dataDetails.medicinesDistributed = parsedData.medicinesDistributed || 0;
        dataDetails.medicalTeamSize = parsedData.medicalTeamSize || 0;
      } else if (response.responseType === 'SHELTER') {
        dataDetails.temporaryShelters = parsedData.temporaryShelters || 0;
        dataDetails.familiesHelped = parsedData.familiesHelped || 0;
        dataDetails.materialUsed = parsedData.materialUsed || '';
      }
    } catch (error) {
      console.warn('Failed to parse response data:', error);
    }
  }

  // Add partial delivery data if available
  if (response.partialDeliveryData) {
    try {
      dataDetails.partialDelivery = typeof response.partialDeliveryData === 'string' 
        ? JSON.parse(response.partialDeliveryData) 
        : response.partialDeliveryData;
    } catch (error) {
      console.warn('Failed to parse partial delivery data:', error);
    }
  }

  return dataDetails;
}

// GET /api/v1/monitoring/drill-down/responses - Get detailed response data with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const incidentIds = searchParams.get('incidentIds')?.split(',').filter(Boolean);
    const entityIds = searchParams.get('entityIds')?.split(',').filter(Boolean);
    const filterResponseTypes = searchParams.get('responseTypes')?.split(',').filter(Boolean);
    const filterStatus = searchParams.get('status')?.split(',').filter(Boolean);
    const timeframeStart = searchParams.get('timeframeStart');
    const timeframeEnd = searchParams.get('timeframeEnd');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const filters = {
      incidentIds,
      entityIds,
      responseTypes: filterResponseTypes,
      status: filterStatus,
      timeframe: timeframeStart && timeframeEnd ? {
        start: timeframeStart,
        end: timeframeEnd,
      } : undefined,
    };
    
    const where = await buildResponseWhereClause(filters);
    
    // Get responses with related data from database
    const responses = await DatabaseService.prisma.rapidResponse.findMany({
      where,
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            organization: true
          }
        }
      },
      orderBy: {
        plannedDate: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count for pagination
    const totalRecords = await DatabaseService.prisma.rapidResponse.count({ where });
    
    // Get related entities and assessments separately
    const affectedEntityIds = responses.map(r => r.affectedEntityId).filter((id): id is string => Boolean(id));
    const assessmentIds = responses.map(r => r.assessmentId).filter((id): id is string => Boolean(id));
    
    const [affectedEntities, assessments] = await Promise.all([
      affectedEntityIds.length > 0 
        ? DatabaseService.prisma.affectedEntity.findMany({
            where: { id: { in: affectedEntityIds } },
            include: {
              incident: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  severity: true,
                  status: true
                }
              }
            }
          })
        : [],
      assessmentIds.length > 0
        ? DatabaseService.prisma.rapidAssessment.findMany({
            where: { id: { in: assessmentIds } },
            select: {
              id: true,
              rapidAssessmentType: true,
              affectedEntityId: true
            }
          })
        : []
    ]);
    
    // Create lookup maps
    const entityMap = new Map(affectedEntities.map(e => [e.id, e]));
    const assessmentMap = new Map(assessments.map(a => [a.id, a]));
    
    // Transform responses to expected format with real data
    const transformedResponses = responses.map(response => {
      const affectedEntity = response.affectedEntityId ? entityMap.get(response.affectedEntityId) : undefined;
      const assessment = response.assessmentId ? assessmentMap.get(response.assessmentId) : undefined;
      
      return {
        id: response.id,
        responseType: response.responseType,
        status: response.status,
        plannedDate: response.plannedDate,
        deliveredDate: response.deliveredDate,
        responderName: response.responderName || 'Unknown',
        entityName: affectedEntity?.name || 'Unknown Entity',
        entityType: affectedEntity?.type || 'COMMUNITY',
        coordinates: { 
          latitude: affectedEntity?.latitude || 0, 
          longitude: affectedEntity?.longitude || 0 
        },
        assessmentType: assessment?.rapidAssessmentType || 'Unknown',
        donorName: response.donor?.name || null,
        dataDetails: extractResponseData(response),
        deliveryItems: response.otherItemsDelivered || [],
        evidenceCount: response.deliveryEvidence ? 1 : 0,
        verificationStatus: response.verificationStatus || 'PENDING',
        incidentId: affectedEntity?.incident?.id || null,
        incidentName: affectedEntity?.incident?.name || null,
      };
    });

    // Generate aggregations
    const aggregations = await DatabaseService.getResponseAggregations(where);
    
    const responseObj = {
      success: true,
      data: transformedResponses,
      meta: {
        filters,
        totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        aggregations,
        exportToken: `export-responses-${Date.now()}`, // For export capability
        lastUpdate: new Date().toISOString(),
      },
      message: 'Detailed response data retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(responseObj);
  } catch (error) {
    console.error('Failed to fetch detailed responses:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch detailed responses'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}