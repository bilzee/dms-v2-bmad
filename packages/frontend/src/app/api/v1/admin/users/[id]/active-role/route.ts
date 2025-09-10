import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { z } from 'zod';
import { requireAdminRole, getCurrentUser } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const activeRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
  reason: z.string().optional()
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/v1/admin/users/:id/active-role - Set user's active role
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id: userId } = await context.params;
    const body = await request.json();

    // Validate request data
    const validationResult = activeRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Validation failed'],
        message: 'Invalid request data',
        details: validationResult.error.errors,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const { roleId, reason } = validationResult.data;

    // Get current admin user info
    const currentUser = await getCurrentUser(request);
    const adminUserId = currentUser?.id || 'unknown';
    const adminUserName = currentUser?.name || 'Unknown Admin';

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Set active role
    const updatedUser = await DatabaseService.setActiveRole(
      userId,
      roleId,
      adminUserId,
      adminUserName,
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      data: {
        userId,
        activeRole: updatedUser.activeRole ? {
          id: updatedUser.activeRole.id,
          name: updatedUser.activeRole.name,
          description: `Active system role`,
          permissions: updatedUser.roles
            .find(r => r.id === updatedUser.activeRole?.id)
            ?.permissions?.map(rp => ({
              id: rp.permission.id,
              name: rp.permission.name,
              description: rp.permission.description,
              resource: rp.permission.resource,
              action: rp.permission.action
            })) || [],
          isActive: updatedUser.activeRole.isActive
        } : null,
        availableRoles: updatedUser.roles.map(role => ({
          id: role.id,
          name: role.name,
          isActive: role.id === updatedUser.activeRoleId
        }))
      },
      message: 'Active role updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to set active role:', error);
    
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['User not found'],
        message: 'User with the specified ID does not exist',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'User does not have the specified role') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid role'],
        message: 'User does not have the specified role assigned',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to set active role'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET /api/v1/admin/users/:id/active-role - Get user's current active role and available roles
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id: userId } = await context.params;

    // Get user with roles
    const userData = await DatabaseService.listUsers({ search: userId });
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

    return NextResponse.json({
      success: true,
      data: {
        userId,
        activeRole: user.activeRole ? {
          id: user.activeRole.id,
          name: user.activeRole.name,
          description: `Active system role`,
          permissions: (user.roles
            .find(r => r.id === user.activeRole?.id) as any)
            ?.permissions?.map((rp: any) => ({
              id: rp.permission.id,
              name: rp.permission.name,
              description: rp.permission.description,
              resource: rp.permission.resource,
              action: rp.permission.action
            })) || [],
          isActive: user.activeRole.isActive
        } : null,
        availableRoles: user.roles.map(role => ({
          id: role.id,
          name: role.name,
          description: `System role with ${(role as any).permissions?.length || 0} permissions`,
          userCount: 0, // Not relevant in this context
          permissions: (role as any).permissions?.map((rp: any) => ({
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description,
            resource: rp.permission.resource,
            action: rp.permission.action
          })) || [],
          isActive: role.id === user.activeRoleId,
          canSwitchTo: true
        })),
        canSwitchRoles: user.roles.length > 1
      },
      message: 'User role information retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch user role information:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch user role information'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}