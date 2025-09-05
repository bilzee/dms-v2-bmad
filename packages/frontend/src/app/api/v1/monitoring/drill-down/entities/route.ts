import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const entityTypes = ['CAMP', 'COMMUNITY'] as const;
const assessmentTypes = ['GENERAL', 'SHELTER', 'HEALTHCARE', 'EDUCATION', 'WASH', 'LIVELIHOOD'] as const;
const responseTypes = ['SUPPLIES', 'SHELTER', 'MEDICAL', 'EVACUATION', 'SECURITY', 'OTHER'] as const;
const incidentTypes = ['FLOOD', 'FIRE', 'LANDSLIDE', 'CYCLONE', 'CONFLICT', 'EPIDEMIC', 'OTHER'] as const;

// Mock detailed entity data generator
const generateDetailedEntities = (filters: any = {}) => {
  const entities = [];
  const count = Math.floor(Math.random() * 30) + 20; // 20-50 entities
  
  for (let i = 0; i < count; i++) {
    const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
    const assessmentHistoryCount = Math.floor(Math.random() * 10) + 2;
    const responseHistoryCount = Math.floor(Math.random() * 8) + 1;
    const incidentAssociationCount = Math.floor(Math.random() * 3) + 1;
    
    // Generate assessment history
    const assessmentHistory = [];
    for (let j = 0; j < assessmentHistoryCount; j++) {
      assessmentHistory.push({
        id: `ASSESS-${String(j + 1).padStart(4, '0')}`,
        type: assessmentTypes[Math.floor(Math.random() * assessmentTypes.length)],
        date: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000), // Last 45 days
        verificationStatus: ['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED'][Math.floor(Math.random() * 4)],
      });
    }
    
    // Generate response history
    const responseHistory = [];
    for (let j = 0; j < responseHistoryCount; j++) {
      const plannedDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      responseHistory.push({
        id: `RESP-${String(j + 1).padStart(4, '0')}`,
        responseType: responseTypes[Math.floor(Math.random() * responseTypes.length)],
        status: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'][Math.floor(Math.random() * 4)],
        plannedDate,
        deliveredDate: Math.random() > 0.4 ? 
          new Date(plannedDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
      });
    }
    
    // Generate incident associations
    const incidentAssociations = [];
    for (let j = 0; j < incidentAssociationCount; j++) {
      incidentAssociations.push({
        id: `INC-${String(j + 1).padStart(3, '0')}`,
        name: `Incident ${j + 1}`,
        type: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
        severity: ['MINOR', 'MODERATE', 'SEVERE', 'CATASTROPHIC'][Math.floor(Math.random() * 4)],
        status: ['ACTIVE', 'CONTAINED', 'RESOLVED'][Math.floor(Math.random() * 3)],
      });
    }
    
    const verifiedAssessments = assessmentHistory.filter(a => a.verificationStatus === 'VERIFIED' || a.verificationStatus === 'AUTO_VERIFIED').length;
    const completedResponses = responseHistory.filter(r => r.status === 'COMPLETED').length;
    const lastActivity = Math.max(
      ...assessmentHistory.map(a => a.date.getTime()),
      ...responseHistory.map(r => r.plannedDate.getTime())
    );
    
    const entity = {
      id: `ENT-${String(i + 1).padStart(4, '0')}`,
      name: `${entityType === 'CAMP' ? 'Camp' : 'Community'} ${Math.floor(Math.random() * 100) + 1}`,
      type: entityType,
      lga: `LGA ${Math.floor(Math.random() * 20) + 1}`,
      ward: `Ward ${Math.floor(Math.random() * 15) + 1}`,
      longitude: 7.0 + Math.random() * 7,
      latitude: 9.0 + Math.random() * 2,
      assessmentHistory,
      responseHistory,
      incidentAssociations,
      activitySummary: {
        totalAssessments: assessmentHistoryCount,
        verifiedAssessments,
        totalResponses: responseHistoryCount,
        completedResponses,
        lastActivity: new Date(lastActivity),
      },
    };
    
    // Apply filters
    if (filters.entityIds && filters.entityIds.length > 0) {
      if (!filters.entityIds.includes(entity.id)) {
        continue;
      }
    }
    
    if (filters.entityTypes && filters.entityTypes.length > 0) {
      if (!filters.entityTypes.includes(entity.type)) {
        continue;
      }
    }
    
    if (filters.lgas && filters.lgas.length > 0) {
      if (!filters.lgas.includes(entity.lga)) {
        continue;
      }
    }
    
    if (filters.activitySince) {
      const activityDate = new Date(filters.activitySince);
      if (entity.activitySummary.lastActivity < activityDate) {
        continue;
      }
    }
    
    entities.push(entity);
  }
  
  return entities;
};

// GET /api/v1/monitoring/drill-down/entities - Get entity-specific detailed data and activity history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const entityIds = searchParams.get('entityIds')?.split(',').filter(Boolean);
    const entityTypes = searchParams.get('entityTypes')?.split(',').filter(Boolean);
    const lgas = searchParams.get('lgas')?.split(',').filter(Boolean);
    const activitySince = searchParams.get('activitySince');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    
    const filters = {
      entityIds,
      entityTypes,
      lgas,
      activitySince,
    };
    
    const allEntities = generateDetailedEntities(filters);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEntities = allEntities.slice(startIndex, endIndex);
    
    // Generate aggregations
    const aggregations = {
      byType: {
        CAMP: allEntities.filter(e => e.type === 'CAMP').length,
        COMMUNITY: allEntities.filter(e => e.type === 'COMMUNITY').length,
      },
      byLga: allEntities.reduce((acc, entity) => {
        acc[entity.lga] = (acc[entity.lga] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      activitySummary: {
        totalAssessments: allEntities.reduce((sum, e) => sum + e.activitySummary.totalAssessments, 0),
        totalResponses: allEntities.reduce((sum, e) => sum + e.activitySummary.totalResponses, 0),
        averageVerificationRate: allEntities.length > 0 
          ? Math.round(allEntities.reduce((sum, e) => 
              sum + (e.activitySummary.verifiedAssessments / e.activitySummary.totalAssessments * 100), 0) / allEntities.length)
          : 0,
        averageResponseRate: allEntities.length > 0
          ? Math.round(allEntities.reduce((sum, e) => 
              sum + (e.activitySummary.completedResponses / e.activitySummary.totalResponses * 100), 0) / allEntities.length)
          : 0,
      },
    };
    
    const response = {
      success: true,
      data: paginatedEntities,
      meta: {
        filters,
        totalRecords: allEntities.length,
        page,
        limit,
        totalPages: Math.ceil(allEntities.length / limit),
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
      error: 'Failed to fetch detailed entities',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}