import { NextRequest, NextResponse } from 'next/server';

// Mock data for situation overview - would be replaced with actual database queries
const generateSituationOverview = () => {
  const totalAssessments = Math.floor(Math.random() * 500) + 100; // 100-600
  const totalResponses = Math.floor(Math.random() * 400) + 80; // 80-480
  const pendingVerification = Math.floor(Math.random() * 50) + 5; // 5-55
  const activeIncidents = Math.floor(Math.random() * 10) + 3; // 3-13
  const criticalGaps = Math.floor(Math.random() * 15) + 2; // 2-17
  
  const realTimeCount = Math.floor((totalAssessments + totalResponses) * 0.7); // 70% real-time
  const recentCount = Math.floor((totalAssessments + totalResponses) * 0.2); // 20% recent
  const offlinePendingCount = Math.floor((totalAssessments + totalResponses) * 0.1); // 10% pending
  
  return {
    timestamp: new Date(),
    totalAssessments,
    totalResponses,
    pendingVerification,
    activeIncidents,
    criticalGaps,
    dataFreshness: {
      realTime: realTimeCount,
      recent: recentCount,
      offlinePending: offlinePendingCount,
    },
  };
};

// GET /api/v1/monitoring/situation/overview - Get real-time situation summary data
export async function GET(request: NextRequest) {
  try {
    const situationData = generateSituationOverview();
    
    const connectionStatus = Math.random() > 0.1 ? 'connected' : 
                           Math.random() > 0.5 ? 'degraded' : 'offline';

    const response = {
      success: true,
      data: situationData,
      meta: {
        refreshInterval: 25, // 25 seconds
        connectionStatus,
        lastUpdate: new Date().toISOString(),
        dataSource: 'real-time',
      },
      message: 'Real-time situation overview retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch situation overview:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch situation overview',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}