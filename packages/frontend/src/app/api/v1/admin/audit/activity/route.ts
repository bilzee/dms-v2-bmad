// app/api/v1/admin/audit/activity/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditLogger } from '@/lib/audit-logger';
import { 
  AuditActivityResponse, 
  AuditActivityFilters,
  SystemActivityLog
} from '@dms/shared/types/admin';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

/**
 * Check if user has admin role
 */
async function requireAdminRole(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Authentication required'],
        message: 'You must be logged in to access this resource'
      }, { status: 401 });
    }

    // Check if user has admin role
    if (!token.roles || !Array.isArray(token.roles) || !token.roles.some((role: any) => role.name === 'ADMIN')) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Access denied'],
        message: 'Admin role required to access audit logs'
      }, { status: 403 });
    }

    return null; // Access granted
  } catch (error) {
    console.error('Admin role check failed:', error);
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Authentication error'],
      message: 'Failed to verify user permissions'
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/admin/audit/activity
 * Retrieve user activity logs with comprehensive filtering and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse<any>> {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100); // Max 100 per page
    const sortBy = (searchParams.get('sortBy') as 'timestamp' | 'severity' | 'eventType') || 'timestamp';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    // Build comprehensive filters
    const filters: AuditActivityFilters = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sortBy,
      sortOrder
    };

    // Basic filters
    if (searchParams.get('userId')) {
      filters.userId = searchParams.get('userId')!;
    }
    if (searchParams.get('action')) {
      filters.action = searchParams.get('action')!;
    }
    if (searchParams.get('resource')) {
      filters.resource = searchParams.get('resource')!;
    }
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }

    // Enhanced filters for Story 9.3
    if (searchParams.get('eventType')) {
      const eventTypes = searchParams.get('eventType')!.split(',');
      filters.eventType = eventTypes as any[];
    }
    if (searchParams.get('severity')) {
      const severities = searchParams.get('severity')!.split(',');
      filters.severity = severities as any[];
    }
    if (searchParams.get('module')) {
      const modules = searchParams.get('module')!.split(',');
      filters.module = modules;
    }
    if (searchParams.get('statusCode')) {
      const statusCodes = searchParams.get('statusCode')!.split(',').map(Number);
      filters.statusCode = statusCodes;
    }
    if (searchParams.get('ipAddress')) {
      filters.ipAddress = searchParams.get('ipAddress')!;
    }
    if (searchParams.get('hasErrors') === 'true') {
      filters.hasErrors = true;
    }
    if (searchParams.get('responseTimeMin')) {
      filters.responseTimeMin = parseInt(searchParams.get('responseTimeMin')!);
    }
    if (searchParams.get('responseTimeMax')) {
      filters.responseTimeMax = parseInt(searchParams.get('responseTimeMax')!);
    }

    // Get activity logs with enhanced filtering
    const activities = await auditLogger.getActivityLogs({
      userId: filters.userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      eventType: filters.eventType,
      severity: filters.severity,
      module: filters.module,
      limit: filters.limit,
      offset: filters.offset
    });

    // Get total count for pagination (simplified - would need optimized count query)
    const totalCount = activities.length; // This would need to be a separate count query in production
    const totalPages = Math.ceil(totalCount / pageSize);

    // Generate aggregations for analytics
    const aggregations = generateAggregations(activities);

    const response: AuditActivityResponse = {
      success: true,
      data: {
        activities: activities as SystemActivityLog[],
        totalCount,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalCount
        },
        aggregations
      },
      message: `Retrieved ${activities.length} activity log entries`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    
    const response = {
      success: false,
      data: null,
      errors: ['Failed to fetch activity logs'],
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * Generate aggregations for analytics dashboard
 */
function generateAggregations(activities: any[]): {
  byEventType: Record<string, number>;
  bySeverity: Record<string, number>;
  byModule: Record<string, number>;
  byHour: Record<string, number>;
} {
  const byEventType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byModule: Record<string, number> = {};
  const byHour: Record<string, number> = {};

  activities.forEach(activity => {
    // Event type aggregation
    const eventType = activity.eventType || 'UNKNOWN';
    byEventType[eventType] = (byEventType[eventType] || 0) + 1;

    // Severity aggregation
    const severity = activity.severity || 'LOW';
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;

    // Module aggregation
    const activityModule = activity.module || 'unknown';
    byModule[activityModule] = (byModule[activityModule] || 0) + 1;

    // Hour aggregation (for activity patterns)
    const hour = new Date(activity.timestamp).getHours();
    const hourKey = `${hour}:00`;
    byHour[hourKey] = (byHour[hourKey] || 0) + 1;
  });

  return {
    byEventType,
    bySeverity,
    byModule,
    byHour
  };
}

/**
 * POST /api/v1/admin/audit/activity
 * Export activity logs (for data export functionality)
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    // This would implement the export functionality
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Export functionality not yet implemented',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to export activity logs:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to export activity logs'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}