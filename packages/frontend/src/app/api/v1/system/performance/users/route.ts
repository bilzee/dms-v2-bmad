import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock user activity data for development
const mockUserActivities = [
  {
    userId: 'user-1',
    userName: 'Sarah Johnson',
    role: 'ASSESSOR' as const,
    sessionStart: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    actionsCount: 45,
    currentPage: '/assessments',
    isActive: true,
  },
  {
    userId: 'user-2',
    userName: 'Michael Chen',
    role: 'RESPONDER' as const,
    sessionStart: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    lastActivity: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    actionsCount: 78,
    currentPage: '/responses/plan',
    isActive: true,
  },
  {
    userId: 'user-3',
    userName: 'Emma Wilson',
    role: 'COORDINATOR' as const,
    sessionStart: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    lastActivity: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
    actionsCount: 32,
    currentPage: '/coordinator/monitoring',
    isActive: true,
  },
  {
    userId: 'user-4',
    userName: 'David Rodriguez',
    role: 'DONOR' as const,
    sessionStart: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    lastActivity: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    actionsCount: 12,
    currentPage: '/donors',
    isActive: false, // Inactive due to time threshold
  },
  {
    userId: 'user-5',
    userName: 'Lisa Anderson',
    role: 'ADMIN' as const,
    sessionStart: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    lastActivity: new Date(Date.now() - 30 * 1000), // 30 seconds ago
    actionsCount: 156,
    currentPage: '/admin/users',
    isActive: true,
  },
];

const mockActivityStats = {
  totalActiveUsers: mockUserActivities.filter(u => u.isActive).length,
  totalSessions: mockUserActivities.length,
  averageSessionDuration: 2.5, // hours
  totalActions: mockUserActivities.reduce((sum, u) => sum + u.actionsCount, 0),
  roleBreakdown: {
    ASSESSOR: mockUserActivities.filter(u => u.role === 'ASSESSOR').length,
    RESPONDER: mockUserActivities.filter(u => u.role === 'RESPONDER').length,
    COORDINATOR: mockUserActivities.filter(u => u.role === 'COORDINATOR').length,
    DONOR: mockUserActivities.filter(u => u.role === 'DONOR').length,
    ADMIN: mockUserActivities.filter(u => u.role === 'ADMIN').length,
  },
  activityHeatmap: {
    // Mock activity by hour (24 hours)
    hourly: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      activeUsers: Math.floor(Math.random() * 20) + 5,
      actions: Math.floor(Math.random() * 200) + 50,
    })),
  },
  topPages: [
    { page: '/assessments', users: 15, percentage: 30 },
    { page: '/responses/plan', users: 12, percentage: 24 },
    { page: '/verification/queue', users: 10, percentage: 20 },
    { page: '/coordinator/monitoring', users: 8, percentage: 16 },
    { page: '/donors', users: 5, percentage: 10 },
  ],
};

// GET /api/v1/system/performance/users - Get current user activity and session data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const role = searchParams.get('role'); // Filter by role
    const timeRange = searchParams.get('timeRange') || '24h'; // 1h, 6h, 24h, 7d

    let filteredUsers = [...mockUserActivities];

    // Filter by active status
    if (!includeInactive) {
      filteredUsers = filteredUsers.filter(user => user.isActive);
    }

    // Filter by role
    if (role && ['ASSESSOR', 'RESPONDER', 'COORDINATOR', 'DONOR', 'ADMIN'].includes(role)) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }

    // Generate session timeline for active users
    const sessionTimeline = filteredUsers
      .filter(user => user.isActive)
      .map(user => ({
        userId: user.userId,
        userName: user.userName,
        role: user.role,
        activities: [
          {
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            action: 'Assessment submitted',
            page: '/assessments/new',
          },
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            action: 'Page viewed',
            page: user.currentPage,
          },
        ],
      }));

    const response = {
      success: true,
      data: {
        users: filteredUsers,
        stats: {
          ...mockActivityStats,
          totalActiveUsers: filteredUsers.filter(u => u.isActive).length,
          totalSessions: filteredUsers.length,
        },
        timeline: sessionTimeline,
        timeRange,
        lastUpdated: new Date(),
      },
      message: `Retrieved ${filteredUsers.length} user activities`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch user activity data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user activity data',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}