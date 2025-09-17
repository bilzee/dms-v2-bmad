import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/monitoring/situation/overview - Get real-time situation summary data
export async function GET(request: NextRequest) {
  try {
    // Get real statistics from database
    const [
      incidentStats,
      entityStats,
      donorStats,
      userStats,
      assessmentStats,
      responseStats
    ] = await Promise.all([
      DatabaseService.getIncidentStats(),
      DatabaseService.getStats(),
      DatabaseService.getDonors(),
      DatabaseService.getUserStats(),
      DatabaseService.getAssessmentStats(),
      DatabaseService.getResponseStats()
    ]);

    // Use real database counts
    const totalAssessments = assessmentStats.totalAssessments;
    const totalResponses = responseStats.totalResponses;
    const pendingVerification = assessmentStats.pendingVerification;
    const activeIncidents = incidentStats.activeIncidents;
    
    // Calculate critical gaps based on unmet needs and high-severity incidents
    const criticalGaps = incidentStats.highPriorityIncidents + responseStats.urgentNeeds;
    
    // Calculate real data freshness based on actual timestamps
    const dataFreshness = await DatabaseService.calculateDataFreshness();

    const situationData = {
      timestamp: new Date(),
      totalAssessments,
      totalResponses,
      pendingVerification,
      activeIncidents,
      criticalGaps,
      totalIncidents: incidentStats.totalIncidents,
      totalUsers: userStats.totalUsers,
      activeUsers: userStats.activeUsers,
      dataFreshness: {
        realTime: dataFreshness.realTime,
        recent: dataFreshness.recent,
        offlinePending: dataFreshness.offlinePending,
      },
      breakdown: {
        incidentsByType: incidentStats.byType,
        incidentsBySeverity: incidentStats.bySeverity,
        incidentsByStatus: incidentStats.byStatus,
        userDistribution: {
          admins: userStats.adminUsers,
          coordinators: userStats.coordinatorUsers,
          activeUsers: userStats.activeUsers,
          inactiveUsers: userStats.inactiveUsers
        }
      }
    };
    
    // Determine connection status based on database response
    const connectionStatus = 'connected'; // Would be based on DB health checks

    const response = {
      success: true,
      data: situationData,
      meta: {
        refreshInterval: 25, // 25 seconds
        connectionStatus,
        lastUpdate: new Date().toISOString(),
        dataSource: 'database',
      },
      message: 'Real-time situation overview retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch situation overview:', error);
    
    // Return degraded service with partial data
    const fallbackData = {
      timestamp: new Date(),
      totalAssessments: 0,
      totalResponses: 0,
      pendingVerification: 0,
      activeIncidents: 0,
      criticalGaps: 0,
      dataFreshness: {
        realTime: 0,
        recent: 0,
        offlinePending: 0,
      },
    };
    
    return NextResponse.json({
      success: false,
      data: fallbackData,
      errors: ['Failed to fetch situation overview'],
      message: error instanceof Error ? error.message : 'Database connection error',
      meta: {
        refreshInterval: 60, // Slower refresh during errors
        connectionStatus: 'offline',
        lastUpdate: new Date().toISOString(),
        dataSource: 'fallback',
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}