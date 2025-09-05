import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Middleware function to check admin access
async function requireAdminRole(request: NextRequest) {
  // For now, return null (allow access) - would need proper auth integration
  // TODO: Implement proper admin role checking with NextAuth
  return null;
}

// GET /api/v1/admin/users/stats - Get user statistics for admin dashboard
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    // Get user statistics from database
    const userStats = await DatabaseService.getUserStats();

    // Get role distribution statistics
    const roleStats = await Promise.all([
      DatabaseService.listUsers({ role: 'ASSESSOR', limit: 0 }),
      DatabaseService.listUsers({ role: 'RESPONDER', limit: 0 }),
      DatabaseService.listUsers({ role: 'COORDINATOR', limit: 0 }),
      DatabaseService.listUsers({ role: 'DONOR', limit: 0 }),
      DatabaseService.listUsers({ role: 'VERIFIER', limit: 0 }),
      DatabaseService.listUsers({ role: 'ADMIN', limit: 0 })
    ]);

    const roleDistribution = {
      'ASSESSOR': roleStats[0].total,
      'RESPONDER': roleStats[1].total,
      'COORDINATOR': roleStats[2].total,
      'DONOR': roleStats[3].total,
      'VERIFIER': roleStats[4].total,
      'ADMIN': roleStats[5].total
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers: userStats.totalUsers,
          activeUsers: userStats.activeUsers,
          inactiveUsers: userStats.inactiveUsers,
          recentUsers: userStats.recentUsers,
          adminUsers: userStats.adminUsers,
          coordinatorUsers: userStats.coordinatorUsers
        },
        roleDistribution,
        trends: {
          // TODO: Implement trend calculations based on time series data
          userGrowth: {
            thisMonth: userStats.recentUsers,
            lastMonth: 0, // TODO: Calculate from historical data
            percentChange: 0
          },
          activeUserTrend: {
            current: userStats.activeUsers,
            previous: 0, // TODO: Calculate from historical data
            percentChange: 0
          }
        },
        activity: {
          // TODO: Implement activity metrics
          totalLogins: 0,
          avgSessionDuration: 0,
          mostActiveUsers: []
        }
      },
      message: 'User statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch user statistics:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user statistics',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}