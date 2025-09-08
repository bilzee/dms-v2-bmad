import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { requireAdminRole } from '@/lib/auth-middleware';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/admin/permissions/matrix - Get complete permission matrix
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    // Get permission matrix
    const matrix = await DatabaseService.getPermissionMatrix();

    // Add metadata
    const lastUpdated = new Date();

    // Group permissions by resource for better organization
    const permissionsByResource = matrix.permissions.reduce((acc, permission) => {
      const resource = permission.resource;
      if (!acc[resource]) {
        acc[resource] = [];
      }
      acc[resource].push(permission);
      return acc;
    }, {} as Record<string, typeof matrix.permissions>);

    // Calculate statistics
    const stats = {
      totalRoles: matrix.roles.length,
      totalPermissions: matrix.permissions.length,
      totalAssignments: Object.values(matrix.matrix).reduce((total, rolePermissions) => {
        return total + Object.values(rolePermissions).filter(Boolean).length;
      }, 0),
      resourceCount: Object.keys(permissionsByResource).length,
      roleStats: matrix.roles.map(role => ({
        roleId: role.id,
        roleName: role.name,
        userCount: role.userCount,
        permissionCount: role.permissions.length,
        permissionCoverage: matrix.permissions.length > 0 
          ? Math.round((role.permissions.length / matrix.permissions.length) * 100)
          : 0
      }))
    };

    return NextResponse.json({
      success: true,
      data: {
        matrix: {
          roles: matrix.roles,
          permissions: matrix.permissions,
          matrix: matrix.matrix,
          permissionsByResource,
          stats
        },
        lastUpdated
      },
      message: 'Permission matrix retrieved successfully'
    });

  } catch (error) {
    console.error('Failed to fetch permission matrix:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch permission matrix'],
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
