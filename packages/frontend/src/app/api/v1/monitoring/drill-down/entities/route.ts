import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Helper function to build where clause for entities
async function buildEntityWhereClause(filters: any) {
  const where: any = {};

  if (filters.entityIds && filters.entityIds.length > 0) {
    where.id = { in: filters.entityIds };
  }

  if (filters.entityTypes && filters.entityTypes.length > 0) {
    where.type = { in: filters.entityTypes };
  }

  if (filters.lgas && filters.lgas.length > 0) {
    where.lga = { in: filters.lgas };
  }

  // Handle incident filtering
  if (filters.incidentIds && filters.incidentIds.length > 0) {
    where.incidentId = { in: filters.incidentIds };
  }

  if (filters.activitySince) {
    // Filter entities with activity since specified date
    const activityDate = new Date(filters.activitySince);
    where.OR = [
      {
        rapidAssessments: {
          some: {
            rapidAssessmentDate: { gte: activityDate }
          }
        }
      },
      {
        rapidResponses: {
          some: {
            plannedDate: { gte: activityDate }
          }
        }
      }
    ];
  }

  return where;
}

// Helper function to get entity assessment history
async function getAssessmentHistory(entityId: string) {
  const assessments = await DatabaseService.prisma.rapidAssessment.findMany({
    where: { affectedEntityId: entityId },
    orderBy: { rapidAssessmentDate: 'desc' },
    take: 10, // Limit to last 10 assessments
    select: {
      id: true,
      rapidAssessmentType: true,
      rapidAssessmentDate: true,
    }
  });

  return assessments.map(assessment => ({
    id: assessment.id,
    type: assessment.rapidAssessmentType,
    date: assessment.rapidAssessmentDate,
    verificationStatus: 'VERIFIED', // Placeholder - field doesn't exist in schema
  }));
}

// Helper function to get entity response history
async function getResponseHistory(entityId: string) {
  const responses = await DatabaseService.prisma.rapidResponse.findMany({
    where: { affectedEntityId: entityId },
    orderBy: { plannedDate: 'desc' },
    take: 8, // Limit to last 8 responses
    select: {
      id: true,
      responseType: true,
      status: true,
      plannedDate: true,
      deliveredDate: true,
    }
  });

  return responses.map(response => ({
    id: response.id,
    responseType: response.responseType,
    status: response.status,
    plannedDate: response.plannedDate,
    deliveredDate: response.deliveredDate,
  }));
}

// Helper function to get entity incident associations
async function getIncidentAssociations(entityId: string) {
  const entity = await DatabaseService.prisma.affectedEntity.findUnique({
    where: { id: entityId },
    include: {
      incident: {
        select: {
          id: true,
          name: true,
          type: true,
          severity: true,
          status: true,
        }
      }
    }
  });

  if (!entity?.incident) return [];

  return [{
    id: entity.incident.id,
    name: entity.incident.name,
    type: entity.incident.type,
    severity: entity.incident.severity,
    status: entity.incident.status,
  }];
}

// GET /api/v1/monitoring/drill-down/entities - Get entity-specific detailed data and activity history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const entityIds = searchParams.get('entityIds')?.split(',').filter(Boolean);
    const entityTypes = searchParams.get('entityTypes')?.split(',').filter(Boolean);
    const lgas = searchParams.get('lgas')?.split(',').filter(Boolean);
    const incidentIds = searchParams.get('incidentIds')?.split(',').filter(Boolean);
    const activitySince = searchParams.get('activitySince');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    
    const filters = {
      entityIds,
      entityTypes,
      lgas,
      incidentIds,
      activitySince,
    };
    
    const where = await buildEntityWhereClause(filters);
    
    // Get entities with related data from database
    const entities = await DatabaseService.prisma.affectedEntity.findMany({
      where,
      include: {
        incident: {
          select: {
            id: true,
            name: true,
            type: true,
            severity: true,
            status: true,
          }
        },
        _count: {
          select: {
            rapidAssessments: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count for pagination
    const totalRecords = await DatabaseService.prisma.affectedEntity.count({ where });
    
    // Transform entities to expected format with additional data
    const transformedEntities = await Promise.all(entities.map(async (entity) => {
      const [assessmentHistory, responseHistory, incidentAssociations] = await Promise.all([
        getAssessmentHistory(entity.id),
        getResponseHistory(entity.id),
        getIncidentAssociations(entity.id)
      ]);

      const verifiedAssessments = assessmentHistory.filter(a => 
        a.verificationStatus === 'VERIFIED' || a.verificationStatus === 'AUTO_VERIFIED'
      ).length;
      
      const completedResponses = responseHistory.filter(r => r.status === 'COMPLETED').length;
      
      const lastActivityDates = [
        ...assessmentHistory.map(a => new Date(a.date).getTime()),
        ...responseHistory.map(r => new Date(r.plannedDate).getTime())
      ].filter(date => !isNaN(date));
      
      const lastActivity = lastActivityDates.length > 0 ? 
        new Date(Math.max(...lastActivityDates)) : 
        entity.createdAt;

      return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        lga: entity.lga,
        ward: entity.ward,
        latitude: entity.latitude,
        longitude: entity.longitude,
        assessmentHistory,
        responseHistory,
        incidentAssociations,
        activitySummary: {
          totalAssessments: entity._count.rapidAssessments,
          verifiedAssessments,
          totalResponses: responseHistory.length,
          completedResponses,
          lastActivity,
        },
        coordinates: {
          latitude: entity.latitude,
          longitude: entity.longitude,
        },
        population: 0, // Population count not available in current schema
        householdCount: 0, // Household count not available in current schema
      };
    }));

    // Generate aggregations
    const aggregations = await DatabaseService.getEntityAggregations(where);
    
    const response = {
      success: true,
      data: transformedEntities,
      meta: {
        filters,
        totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        aggregations,
        exportToken: `export-entities-${Date.now()}`,
        lastUpdate: new Date().toISOString(),
      },
      message: 'Detailed entity data with activity history retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch detailed entities:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch detailed entities'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}