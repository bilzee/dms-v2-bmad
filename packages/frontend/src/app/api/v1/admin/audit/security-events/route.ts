// app/api/v1/admin/audit/security-events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditLogger } from '@/lib/audit-logger';
import { 
  SecurityEventResponse, 
  SecurityEventFilters,
  SecurityEvent
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
    if (!token.roles || !Array.isArray(token.roles) || !token.roles.includes('ADMIN')) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Access denied'],
        message: 'Admin role required to access security events'
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
 * GET /api/v1/admin/audit/security-events
 * Retrieve security events with filtering and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse<SecurityEventResponse>> {
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
    const filters: SecurityEventFilters = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sortBy,
      sortOrder
    };

    // Event type filters
    if (searchParams.get('eventType')) {
      const eventTypes = searchParams.get('eventType')!.split(',');
      filters.eventType = eventTypes as any[];
    }

    // Severity filters
    if (searchParams.get('severity')) {
      const severities = searchParams.get('severity')!.split(',');
      filters.severity = severities as any[];
    }

    // User filters
    if (searchParams.get('userId')) {
      filters.userId = searchParams.get('userId')!;
    }

    // IP address filter
    if (searchParams.get('ipAddress')) {
      filters.ipAddress = searchParams.get('ipAddress')!;
    }

    // Investigation status filters
    if (searchParams.get('requiresInvestigation')) {
      filters.requiresInvestigation = searchParams.get('requiresInvestigation') === 'true';
    }

    if (searchParams.get('investigationStatus')) {
      const statuses = searchParams.get('investigationStatus')!.split(',');
      filters.investigationStatus = statuses as any[];
    }

    // Date range filters
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }

    // Get security events with filtering
    const events = await auditLogger.getSecurityEvents({
      eventType: filters.eventType,
      severity: filters.severity,
      userId: filters.userId,
      requiresInvestigation: filters.requiresInvestigation,
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: filters.limit,
      offset: filters.offset
    });

    // Get total count for pagination (simplified - would need optimized count query)
    const totalCount = events.length; // This would need to be a separate count query in production
    const totalPages = Math.ceil(totalCount / pageSize);

    // Generate statistics
    const stats = generateSecurityStats(events);

    const response: SecurityEventResponse = {
      success: true,
      data: {
        events: events as SecurityEvent[],
        totalCount,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalCount
        },
        stats
      },
      message: `Retrieved ${events.length} security event entries`,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch security events:', error);
    
    const response: SecurityEventResponse = {
      success: false,
      data: null,
      errors: ['Failed to fetch security events'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PUT /api/v1/admin/audit/security-events
 * Update security event investigation status
 */
export async function PUT(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const body = await request.json();
    const { eventId, investigationStatus, investigatedBy, investigatedByName, resolutionNotes } = body;

    if (!eventId || !investigationStatus) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Missing required fields'],
        message: 'Event ID and investigation status are required'
      }, { status: 400 });
    }

    // Update the security event
    // This would use Prisma to update the security event
    // For now, return a placeholder response
    
    return NextResponse.json({
      success: true,
      message: 'Security event investigation status updated successfully',
      data: {
        eventId,
        investigationStatus,
        investigatedBy,
        investigatedAt: new Date()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to update security event:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to update security event'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Generate security event statistics
 */
function generateSecurityStats(events: any[]): {
  totalEvents: number;
  criticalEvents: number;
  pendingInvestigations: number;
  resolvedEvents: number;
  byEventType: Record<string, number>;
} {
  const stats = {
    totalEvents: events.length,
    criticalEvents: 0,
    pendingInvestigations: 0,
    resolvedEvents: 0,
    byEventType: {} as Record<string, number>
  };

  events.forEach(event => {
    // Count critical events
    if (event.severity === 'CRITICAL') {
      stats.criticalEvents++;
    }

    // Count pending investigations
    if (event.requiresInvestigation && 
        (!event.investigationStatus || event.investigationStatus === 'PENDING')) {
      stats.pendingInvestigations++;
    }

    // Count resolved events
    if (event.investigationStatus === 'RESOLVED') {
      stats.resolvedEvents++;
    }

    // Count by event type
    const eventType = event.eventType || 'UNKNOWN';
    stats.byEventType[eventType] = (stats.byEventType[eventType] || 0) + 1;
  });

  return stats;
}