import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';


// Middleware function to check admin access
async function requireAdminRole(request: NextRequest) {
  // TODO: Implement proper admin role checking with NextAuth
  return null;
}

// GET /api/v1/admin/roles - Get all roles for admin management
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const roles = await DatabaseService.getAllRoles();

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: `System role with ${role.permissions?.length || 0} permissions`,
      userCount: role._count?.users || 0,
      permissions: role.permissions?.map(rp => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        resource: rp.permission.resource,
        action: rp.permission.action
      })) || []
    }));

    return NextResponse.json({
      success: true,
      data: {
        roles: formattedRoles
      },
      message: 'Roles retrieved successfully'
    });

  } catch (error) {
    console.error('Failed to fetch roles:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch roles'],
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
