import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock geographic data for assessments - would be replaced with actual database queries
const generateMapAssessments = () => {
  const assessmentTypes = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'] as const;
  const verificationStatuses = ['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED'] as const;
  const priorityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
  const assessorNames = ['Dr. Smith', 'Nurse Johnson', 'Field Worker Ali', 'Coordinator Sarah', 'Supervisor Ahmed'];
  const entityNames = ['Camp Alpha', 'Community Beta', 'Settlement Gamma', 'Village Delta', 'Camp Epsilon'];
  
  // Generate random coordinates within Borno State bounds
  const generateCoordinates = () => ({
    latitude: 11.5 + Math.random() * 2.5,
    longitude: 13.0 + Math.random() * 2.0,
    accuracy: Math.floor(Math.random() * 10) + 5,
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
    captureMethod: Math.random() > 0.7 ? 'GPS' : Math.random() > 0.5 ? 'MAP_SELECT' : 'MANUAL'
  });

  const assessments = Array.from({ length: Math.floor(Math.random() * 100) + 50 }, (_, i) => {
    const type = assessmentTypes[Math.floor(Math.random() * assessmentTypes.length)];
    const verificationStatus = verificationStatuses[Math.floor(Math.random() * verificationStatuses.length)];
    const coordinates = generateCoordinates();
    
    // Priority based on type and verification status
    const priorityWeight = type === 'HEALTH' || type === 'SECURITY' ? 0.7 : 
                          type === 'FOOD' || type === 'WASH' ? 0.5 : 0.3;
    const verificationWeight = verificationStatus === 'REJECTED' ? 0.9 : 
                              verificationStatus === 'PENDING' ? 0.7 : 0.3;
    const combinedWeight = (priorityWeight + verificationWeight) / 2;
    
    const priorityLevel = combinedWeight > 0.7 ? 'CRITICAL' :
                         combinedWeight > 0.5 ? 'HIGH' :
                         combinedWeight > 0.3 ? 'MEDIUM' : 'LOW';

    return {
      id: `assessment-${i + 1}`,
      type,
      date: new Date(Date.now() - Math.random() * 86400000 * 14), // Within last 2 weeks
      assessorName: assessorNames[Math.floor(Math.random() * assessorNames.length)],
      coordinates,
      entityName: entityNames[Math.floor(Math.random() * entityNames.length)],
      verificationStatus,
      priorityLevel,
    };
  });

  // Calculate status and type breakdowns
  const statusBreakdown = {
    pending: assessments.filter(a => a.verificationStatus === 'PENDING').length,
    verified: assessments.filter(a => a.verificationStatus === 'VERIFIED' || a.verificationStatus === 'AUTO_VERIFIED').length,
    rejected: assessments.filter(a => a.verificationStatus === 'REJECTED').length,
  };

  const typeBreakdown = assessmentTypes.reduce((acc, type) => {
    acc[type] = assessments.filter(a => a.type === type).length;
    return acc;
  }, {} as Record<typeof assessmentTypes[number], number>);

  return {
    assessments,
    statusBreakdown,
    typeBreakdown,
  };
};

// GET /api/v1/monitoring/map/assessments - Get assessment locations with status indicators
export async function GET(request: NextRequest) {
  try {
    const { assessments, statusBreakdown, typeBreakdown } = generateMapAssessments();
    
    const connectionStatus = Math.random() > 0.1 ? 'connected' : 
                           Math.random() > 0.5 ? 'degraded' : 'offline';

    const response = {
      success: true,
      data: assessments,
      meta: {
        statusBreakdown,
        typeBreakdown,
        lastUpdate: new Date(),
        refreshInterval: 25, // 25 seconds - consistent with Story 6.1
        connectionStatus,
        dataSource: 'real-time',
      },
      message: 'Map assessments retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch map assessments:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch map assessments'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}