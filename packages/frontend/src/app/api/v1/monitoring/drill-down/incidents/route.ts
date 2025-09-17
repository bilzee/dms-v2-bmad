import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Helper function to build where clause for incidents
function buildIncidentWhereClause(filters: any) {
  const where: any = {};

  if (filters.incidentIds && filters.incidentIds.length > 0) {
    where.id = { in: filters.incidentIds };
  }

  if (filters.types && filters.types.length > 0) {
    where.type = { in: filters.types };
  }

  if (filters.severities && filters.severities.length > 0) {
    where.severity = { in: filters.severities };
  }

  if (filters.statuses && filters.statuses.length > 0) {
    where.status = { in: filters.statuses };
  }

  if (filters.timeframe) {
    where.date = {
      gte: new Date(filters.timeframe.start),
      lte: new Date(filters.timeframe.end)
    };
  }

  return where;
}

// Helper function to generate timeline data for an incident
async function generateTimelineData(incidentId: string, days: number = 30) {
  const timelineData = [];
  
  // Get affected entities for this incident
  const affectedEntities = await DatabaseService.prisma.affectedEntity.findMany({
    where: { incidentId },
    select: { id: true }
  });
  
  const affectedEntityIds = affectedEntities.map(e => e.id);
  
  for (let day = days - 1; day >= 0; day--) {
    const date = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    
    const [assessments, responses] = await Promise.all([
      DatabaseService.prisma.rapidAssessment.count({
        where: {
          affectedEntityId: { in: affectedEntityIds },
          rapidAssessmentDate: {
            gte: date,
            lt: nextDate
          }
        }
      }),
      DatabaseService.prisma.rapidResponse.count({
        where: {
          affectedEntityId: { in: affectedEntityIds },
          plannedDate: {
            gte: date,
            lt: nextDate
          }
        }
      })
    ]);
    
    timelineData.push({
      date,
      assessments,
      responses
    });
  }
  
  return timelineData;
}

// Helper function to extract incident verification progress
async function getVerificationProgress(incidentId: string) {
  // Get affected entities for this incident
  const affectedEntities = await DatabaseService.prisma.affectedEntity.findMany({
    where: { incidentId },
    select: { id: true }
  });
  
  const affectedEntityIds = affectedEntities.map(e => e.id);

  const [
    assessmentStats,
    responseStats
  ] = await Promise.all([
    // Assessment verification stats - note: assessments don't have verification status in schema
    DatabaseService.prisma.rapidAssessment.count({
      where: {
        affectedEntityId: { in: affectedEntityIds }
      }
    }),
    // Response verification stats
    DatabaseService.prisma.rapidResponse.groupBy({
      by: ['verificationStatus'],
      where: {
        affectedEntityId: { in: affectedEntityIds }
      },
      _count: { verificationStatus: true }
    })
  ]);

  const responseVerification = responseStats.reduce((acc, stat) => {
    acc[stat.verificationStatus.toLowerCase()] = stat._count.verificationStatus;
    return acc;
  }, {} as Record<string, number>);

  return {
    assessments: {
      total: assessmentStats,
      // Assessments don't have verification status in current schema
      pending: 0,
      verified: assessmentStats,
      rejected: 0,
    },
    responses: {
      pending: responseVerification.pending || 0,
      verified: (responseVerification.verified || 0) + (responseVerification.auto_verified || 0),
      rejected: responseVerification.rejected || 0,
    },
  };
}

// GET /api/v1/monitoring/drill-down/incidents - Get incident drill-down data with historical trends
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const incidentIds = searchParams.get('incidentIds')?.split(',').filter(Boolean);
    const types = searchParams.get('types')?.split(',').filter(Boolean);
    const severities = searchParams.get('severities')?.split(',').filter(Boolean);
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean);
    const timeframeStart = searchParams.get('timeframeStart');
    const timeframeEnd = searchParams.get('timeframeEnd');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const filters = {
      incidentIds,
      types,
      severities,
      statuses,
      timeframe: timeframeStart && timeframeEnd ? {
        start: timeframeStart,
        end: timeframeEnd,
      } : undefined,
    };
    
    const where = buildIncidentWhereClause(filters);
    
    // Get incidents with related data from database
    const incidents = await DatabaseService.prisma.incident.findMany({
      where,
      include: {
        affectedEntities: true
      },
      orderBy: {
        date: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count for pagination
    const totalRecords = await DatabaseService.prisma.incident.count({ where });
    
    // Transform incidents to expected format with additional data
    const transformedIncidents = await Promise.all(incidents.map(async (incident) => {
      // Get real counts for this incident
      const affectedEntityIds = incident.affectedEntities.map(e => e.id);
      
      const [assessmentCount, responseCount] = await Promise.all([
        DatabaseService.prisma.rapidAssessment.count({
          where: {
            affectedEntityId: { in: affectedEntityIds }
          }
        }),
        DatabaseService.prisma.rapidResponse.count({
          where: {
            affectedEntityId: { in: affectedEntityIds }
          }
        })
      ]);
      
      // Get location from affected entities (average coordinates)
      const entities = incident.affectedEntities;
      let location = { latitude: 0, longitude: 0 };
      
      if (entities.length > 0) {
        const validEntities = entities.filter(e => e.latitude !== null && e.longitude !== null);
        if (validEntities.length > 0) {
          location = {
            latitude: validEntities.reduce((sum, e) => sum + e.latitude, 0) / validEntities.length,
            longitude: validEntities.reduce((sum, e) => sum + e.longitude, 0) / validEntities.length
          };
        }
      }
      
      const [timelineData, verificationProgress] = await Promise.all([
        generateTimelineData(incident.id),
        getVerificationProgress(incident.id)
      ]);
      
      return {
        id: incident.id,
        name: incident.name,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        date: incident.date,
        assessmentCount,
        responseCount,
        affectedEntityCount: incident.affectedEntities.length,
        verificationProgress,
        timelineData,
        location,
        // Add additional fields from schema
        subType: incident.subType,
        source: incident.source,
      };
    }));

    // Generate aggregations
    const aggregations = await DatabaseService.getIncidentAggregations(where);
    
    const response = {
      success: true,
      data: transformedIncidents,
      meta: {
        filters,
        totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        aggregations,
        exportToken: `export-incidents-${Date.now()}`,
        lastUpdate: new Date().toISOString(),
      },
      message: 'Detailed incident data with historical trends retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch detailed incidents:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch detailed incidents'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}