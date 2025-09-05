import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock geographic data for affected entities - would be replaced with actual database queries
const generateMapEntities = () => {
  const entityTypes = ['CAMP', 'COMMUNITY'] as const;
  const lgas = ['Maiduguri', 'Jere', 'Konduga', 'Mafa', 'Dikwa', 'Ngala'];
  const wards = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'];
  
  // Generate random coordinates within Borno State bounds (approximate)
  const generateCoordinates = () => ({
    latitude: 11.5 + Math.random() * 2.5, // 11.5 to 14.0 (Borno State area)
    longitude: 13.0 + Math.random() * 2.0, // 13.0 to 15.0 (Borno State area)
    accuracy: Math.floor(Math.random() * 10) + 5, // 5-15 meter accuracy
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7), // Within last week
    captureMethod: Math.random() > 0.7 ? 'GPS' : Math.random() > 0.5 ? 'MAP_SELECT' : 'MANUAL'
  });

  const entities = Array.from({ length: Math.floor(Math.random() * 30) + 20 }, (_, i) => {
    const coordinates = generateCoordinates();
    const assessmentCount = Math.floor(Math.random() * 15) + 1;
    const responseCount = Math.floor(Math.random() * 10);
    const pendingAssessments = Math.floor(Math.random() * 5);
    const verifiedAssessments = assessmentCount - pendingAssessments;
    const activeResponses = Math.floor(responseCount * 0.3);
    const completedResponses = responseCount - activeResponses;

    return {
      id: `entity-${i + 1}`,
      name: `${entityTypes[Math.floor(Math.random() * entityTypes.length)]} ${i + 1}`,
      type: entityTypes[Math.floor(Math.random() * entityTypes.length)],
      longitude: coordinates.longitude,
      latitude: coordinates.latitude,
      coordinates,
      assessmentCount,
      responseCount,
      lastActivity: new Date(Date.now() - Math.random() * 86400000 * 3), // Within last 3 days
      statusSummary: {
        pendingAssessments,
        verifiedAssessments,
        activeResponses,
        completedResponses,
      },
    };
  });

  // Calculate bounding box
  const latitudes = entities.map(e => e.latitude);
  const longitudes = entities.map(e => e.longitude);
  
  return {
    entities,
    boundingBox: {
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
    },
    totalEntities: entities.length,
  };
};

// GET /api/v1/monitoring/map/entities - Get affected entities with coordinates and activity summary
export async function GET(request: NextRequest) {
  try {
    const { entities, boundingBox, totalEntities } = generateMapEntities();
    
    const connectionStatus = Math.random() > 0.1 ? 'connected' : 
                           Math.random() > 0.5 ? 'degraded' : 'offline';

    const response = {
      success: true,
      data: entities,
      meta: {
        boundingBox,
        totalEntities,
        lastUpdate: new Date(),
        refreshInterval: 25, // 25 seconds - consistent with Story 6.1
        connectionStatus,
        dataSource: 'real-time',
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