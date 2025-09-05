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

// GET /api/v1/admin/system/audit - Get system audit trail
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const userId = searchParams.get('userId') || '';
    const action = searchParams.get('action') || '';
    const resource = searchParams.get('resource') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filters
    const filters: any = {
      limit: pageSize,
      offset: (page - 1) * pageSize
    };

    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    // Get audit trail from database
    const auditLogs = await DatabaseService.getAuditTrail(filters);

    // Get total count for pagination
    // TODO: Add count method to DatabaseService for audit logs
    const totalCount = auditLogs.length; // Simplified for now

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      success: true,
      data: {
        auditLogs: auditLogs.map(log => ({
          id: log.id,
          userId: log.userId,
          user: log.user ? {
            name: log.user.name,
            email: log.user.email
          } : null,
          action: log.action,
          resource: log.resource,
          details: log.details,
          timestamp: log.timestamp,
          ipAddress: log.ipAddress || null,
          userAgent: log.userAgent || null
        })),
        pagination: {
          page,
          pageSize,
          totalPages,
          totalCount,
        },
        filters: {
          availableActions: [
            'CREATE_USER',
            'UPDATE_USER',
            'DELETE_USER',
            'ASSIGN_ROLE',
            'REMOVE_ROLE',
            'LOGIN',
            'LOGOUT',
            'CREATE_INCIDENT',
            'UPDATE_INCIDENT',
            'CREATE_ASSESSMENT',
            'VERIFY_ASSESSMENT',
            'CREATE_RESPONSE',
            'UPDATE_RESPONSE'
          ],
          availableResources: [
            'USER',
            'ROLE',
            'INCIDENT',
            'ASSESSMENT',
            'RESPONSE',
            'ENTITY',
            'SYSTEM'
          ]
        }
      },
      message: `Retrieved ${totalCount} audit log entries`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch audit trail:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch audit trail',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}