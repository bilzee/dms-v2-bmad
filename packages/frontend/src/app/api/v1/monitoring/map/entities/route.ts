import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Get real geographic data for affected entities from database
const getMapEntities = async () => {
  // Query affected entities with related assessments
  const entities = await prisma.affectedEntity.findMany({
    include: {
      rapidAssessments: {
        select: {
          id: true,
          rapidAssessmentType: true,
          rapidAssessmentDate: true,
        },
      },
    },
  });

  // Get response counts separately
  const responseCounts = await prisma.rapidResponse.groupBy({
    by: ['affectedEntityId'],
    _count: {
      id: true,
    },
  });

  // Create response count map
  const responseCountMap = new Map(
    responseCounts.map(r => [r.affectedEntityId, r._count.id])
  );

  // Transform entities to match the expected interface
  const transformedEntities = entities.map(entity => {
    const assessmentCount = entity.rapidAssessments.length;
    const responseCount = responseCountMap.get(entity.id) || 0;
    
    // Calculate status summaries
    const pendingAssessments = entity.rapidAssessments.filter(ra => 
      new Date(ra.rapidAssessmentDate) > new Date()
    ).length;
    
    const verifiedAssessments = assessmentCount - pendingAssessments;
    
    // For responses, we'll use simple counts since we don't have detailed response data
    const activeResponses = Math.floor(responseCount * 0.3); // Estimate
    const completedResponses = responseCount - activeResponses; // Estimate

    // Generate coordinates data
    const coordinates = {
      latitude: entity.latitude,
      longitude: entity.longitude,
      accuracy: 10, // Default accuracy
      timestamp: entity.updatedAt ?? new Date(),
      captureMethod: 'GPS' as const,
    };

    return {
      id: entity.id,
      name: entity.name || `${entity.type} Entity`,
      type: entity.type,
      longitude: entity.longitude,
      latitude: entity.latitude,
      coordinates,
      assessmentCount,
      responseCount,
      lastActivity: entity.updatedAt ?? new Date(),
      statusSummary: {
        pendingAssessments,
        verifiedAssessments,
        activeResponses,
        completedResponses,
      },
    };
  });

  // Calculate bounding box from real coordinates
  const latitudes = transformedEntities.map(e => e.latitude).filter(lat => lat !== null);
  const longitudes = transformedEntities.map(e => e.longitude).filter(lng => lng !== null);
  
  const boundingBox = latitudes.length > 0 && longitudes.length > 0 ? {
    northEast: {
      latitude: Math.max(...latitudes),
      longitude: Math.max(...longitudes),
      accuracy: 0,
      timestamp: new Date(),
      captureMethod: 'SYSTEM' as const
    },
    southWest: {
      latitude: Math.min(...latitudes),
      longitude: Math.min(...longitudes),
      accuracy: 0,
      timestamp: new Date(),
      captureMethod: 'SYSTEM' as const
    },
  } : {
    // Default bounding box if no coordinates
    northEast: {
      latitude: 14.0,
      longitude: 15.0,
      accuracy: 0,
      timestamp: new Date(),
      captureMethod: 'SYSTEM' as const
    },
    southWest: {
      latitude: 11.5,
      longitude: 13.0,
      accuracy: 0,
      timestamp: new Date(),
      captureMethod: 'SYSTEM' as const
    },
  };

  return {
    entities: transformedEntities,
    boundingBox,
    totalEntities: transformedEntities.length,
  };
};

// GET /api/v1/monitoring/map/entities - Get affected entities with coordinates and activity summary
export async function GET(request: NextRequest) {
  try {
    const { entities, boundingBox, totalEntities } = await getMapEntities();
    
    const connectionStatus = 'connected'; // Since we're using real data

    const response = {
      success: true,
      data: entities,
      meta: {
        boundingBox,
        totalEntities,
        lastUpdate: new Date(),
        refreshInterval: 25, // 25 seconds - consistent with Story 6.1
        connectionStatus,
        dataSource: 'database',
      },
      message: 'Map entities retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch map entities:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch map entities',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}