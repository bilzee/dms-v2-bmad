import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { requireAdminRole } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/v1/admin/users/:id/role-history - Get user role change history
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id: userId } = await context.params;
    const url = new URL(request.url);
    
    // Parse query parameters
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const page = Math.floor(offset / limit) + 1;

    // Validate parameters
    if (limit > 100) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid parameters'],
        message: 'Limit cannot exceed 100',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Get role history
    const historyResult = await DatabaseService.getUserRoleHistory(userId, limit, offset);

    // Get role and user names for better display
    const [allRoles, userData] = await Promise.all([
      DatabaseService.getAllRoles(),
      DatabaseService.listUsers({ search: userId })
    ]);

    const user = userData.users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['User not found'],
        message: 'User with the specified ID does not exist',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Enrich history with role names
    const enrichedHistory = historyResult.history.map(record => {
      const role = allRoles.find(r => r.id === record.roleId);
      return {
        id: record.id,
        userId: record.userId,
        roleId: record.roleId,
        roleName: role?.name || 'Unknown Role',
        action: record.action,
        previousData: record.previousData,
        changedBy: record.changedBy,
        changedByName: record.changedByName,
        reason: record.reason,
        ipAddress: record.ipAddress,
        userAgent: record.userAgent,
        createdAt: record.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        history: enrichedHistory,
        totalCount: historyResult.total,
        pagination: {
          page,
          pageSize: limit,
          totalPages: historyResult.pagination.totalPages,
          totalCount: historyResult.total
        }
      },
      message: 'Role history retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch role history:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch role history'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}