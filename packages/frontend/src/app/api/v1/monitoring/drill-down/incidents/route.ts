import { NextRequest, NextResponse } from 'next/server';

const incidentTypes = ['FLOOD', 'FIRE', 'LANDSLIDE', 'CYCLONE', 'CONFLICT', 'EPIDEMIC', 'OTHER'] as const;
const severityLevels = ['MINOR', 'MODERATE', 'SEVERE', 'CATASTROPHIC'] as const;
const statusLevels = ['ACTIVE', 'CONTAINED', 'RESOLVED'] as const;

// Mock detailed incident data generator
const generateDetailedIncidents = (filters: any = {}) => {
  const incidents = [];
  const count = Math.floor(Math.random() * 10) + 5; // 5-15 incidents
  
  for (let i = 0; i < count; i++) {
    const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
    const status = statusLevels[Math.floor(Math.random() * statusLevels.length)];
    const startDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Last 60 days
    
    const assessmentCount = Math.floor(Math.random() * 50) + 10;
    const responseCount = Math.floor(Math.random() * 40) + 5;
    const affectedEntityCount = Math.floor(Math.random() * 20) + 3;
    
    // Generate historical timeline data (last 30 days)
    const timelineData = [];
    for (let day = 29; day >= 0; day--) {
      const date = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
      timelineData.push({
        date,
        assessments: Math.floor(Math.random() * 5),
        responses: Math.floor(Math.random() * 3),
      });
    }
    
    const incident = {
      id: `INC-${String(i + 1).padStart(3, '0')}`,
      name: `${type.charAt(0) + type.slice(1).toLowerCase()} Incident ${i + 1}`,
      type,
      severity,
      status,
      date: startDate,
      assessmentCount,
      responseCount,
      affectedEntityCount,
      verificationProgress: {
        assessments: {
          pending: Math.floor(assessmentCount * 0.2),
          verified: Math.floor(assessmentCount * 0.7),
          rejected: Math.floor(assessmentCount * 0.1),
        },
        responses: {
          pending: Math.floor(responseCount * 0.15),
          verified: Math.floor(responseCount * 0.8),
          rejected: Math.floor(responseCount * 0.05),
        },
      },
      timelineData,
    };
    
    // Apply filters
    if (filters.incidentIds && filters.incidentIds.length > 0) {
      if (!filters.incidentIds.includes(incident.id)) {
        continue;
      }
    }
    
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(incident.type)) {
        continue;
      }
    }
    
    if (filters.severities && filters.severities.length > 0) {
      if (!filters.severities.includes(incident.severity)) {
        continue;
      }
    }
    
    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(incident.status)) {
        continue;
      }
    }
    
    if (filters.timeframe) {
      const incidentDate = new Date(incident.date);
      if (incidentDate < new Date(filters.timeframe.start) || incidentDate > new Date(filters.timeframe.end)) {
        continue;
      }
    }
    
    incidents.push(incident);
  }
  
  return incidents;
};

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
    
    const allIncidents = generateDetailedIncidents(filters);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedIncidents = allIncidents.slice(startIndex, endIndex);
    
    // Generate aggregations
    const aggregations = {
      byType: incidentTypes.reduce((acc, type) => {
        acc[type] = allIncidents.filter(i => i.type === type).length;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: severityLevels.reduce((acc, severity) => {
        acc[severity] = allIncidents.filter(i => i.severity === severity).length;
        return acc;
      }, {} as Record<string, number>),
      byStatus: statusLevels.reduce((acc, status) => {
        acc[status] = allIncidents.filter(i => i.status === status).length;
        return acc;
      }, {} as Record<string, number>),
      totalAssessments: allIncidents.reduce((sum, i) => sum + i.assessmentCount, 0),
      totalResponses: allIncidents.reduce((sum, i) => sum + i.responseCount, 0),
      totalEntities: allIncidents.reduce((sum, i) => sum + i.affectedEntityCount, 0),
    };
    
    const response = {
      success: true,
      data: paginatedIncidents,
      meta: {
        filters,
        totalRecords: allIncidents.length,
        page,
        limit,
        totalPages: Math.ceil(allIncidents.length / limit),
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
      error: 'Failed to fetch detailed incidents',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}