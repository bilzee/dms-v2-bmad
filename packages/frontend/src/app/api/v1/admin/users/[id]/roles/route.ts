import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import NotificationService from '@/lib/services/NotificationService';
import { z } from 'zod';
import { requireAdminRole, getCurrentUser } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const roleAssignmentSchema = z.object({
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
  reason: z.string().optional(),
  notifyUser: z.boolean().optional().default(false)
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/v1/admin/users/:id/roles - Assign roles to user
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id: userId } = await context.params;
    const body = await request.json();

    // Validate request data
    const validationResult = roleAssignmentSchema.safeParse(body);
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

    const { roleIds, reason, notifyUser } = validationResult.data;

    // Get current admin user info
    const currentUser = await getCurrentUser(request);
    const adminUserId = currentUser?.id || 'unknown';
    const adminUserName = currentUser?.name || 'Unknown Admin';

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Assign roles
    const updatedUser = await DatabaseService.assignUserRoles(
      userId,
      roleIds,
      adminUserId,
      adminUserName,
      reason,
      ipAddress,
      userAgent
    );

    // Get role details for response
    const allRoles = await DatabaseService.getAllRoles();
    const assignedRoles = allRoles.filter(role => roleIds.includes(role.id));
    const removedRoles = allRoles.filter(role => 
      updatedUser.roles.length > 0 && !roleIds.includes(role.id) && 
      updatedUser.roles.some(userRole => userRole.id === role.id)
    );

    // Send notification if requested
    if (notifyUser) {
      try {
        const user = { id: userId, name: updatedUser.name || 'Unknown', email: updatedUser.email || '' } as any;
        const admin = { id: adminUserId, name: adminUserName };
        
        await NotificationService.sendRoleAssignmentNotification(
          user,
          assignedRoles,
          [],
          admin,
          reason
        );
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the role assignment if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        assignedRoles: assignedRoles.map(role => ({
          id: role.id,
          name: role.name,
          description: `System role with ${role.permissions?.length || 0} permissions`,
          userCount: role._count?.users || 0,
          permissions: role.permissions?.map(rp => ({
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description,
            resource: rp.permission.resource,
            action: rp.permission.action,
            isActive: rp.permission.isActive
          })) || [],
          isActive: role.isActive
        })),
        removedRoles: [], // Will be populated in PUT request
        activeRole: updatedUser.activeRole ? {
          id: updatedUser.activeRole.id,
          name: updatedUser.activeRole.name,
          description: `System role with permissions`,
          userCount: 0,
          permissions: [],
          isActive: updatedUser.activeRole.isActive
        } : null,
        changeId: `role_change_${Date.now()}`
      },
      message: 'User roles assigned successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to assign user roles:', error);
    
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['User not found'],
        message: 'User with the specified ID does not exist',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to assign user roles'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// PUT /api/v1/admin/users/:id/roles - Update user role assignments
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id: userId } = await context.params;
    const body = await request.json();

    // Validate request data
    const validationResult = roleAssignmentSchema.safeParse(body);
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

    const { roleIds, reason, notifyUser } = validationResult.data;

    // Get current admin user info
    const currentUser = await getCurrentUser(request);
    const adminUserId = currentUser?.id || 'unknown';
    const adminUserName = currentUser?.name || 'Unknown Admin';

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Get current user roles before update
    const currentUserData = await DatabaseService.listUsers({ search: userId });
    const currentUser_Data = currentUserData.users.find(u => u.id === userId);
    const currentRoleIds = currentUser_Data?.roles.map(r => r.id) || [];

    // Update roles
    const updatedUser = await DatabaseService.assignUserRoles(
      userId,
      roleIds,
      adminUserId,
      adminUserName,
      reason,
      ipAddress,
      userAgent
    );

    // Get role details for response
    const allRoles = await DatabaseService.getAllRoles();
    const assignedRoles = allRoles.filter(role => 
      roleIds.includes(role.id) && !currentRoleIds.includes(role.id)
    );
    const removedRoles = allRoles.filter(role => 
      currentRoleIds.includes(role.id) && !roleIds.includes(role.id)
    );

    // Send notification if requested
    if (notifyUser) {
      try {
        const user = { id: userId, name: updatedUser.name || 'Unknown', email: updatedUser.email || '' } as any;
        const admin = { id: adminUserId, name: adminUserName };
        
        await NotificationService.sendRoleAssignmentNotification(
          user,
          assignedRoles,
          removedRoles,
          admin,
          reason
        );
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the role assignment if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        assignedRoles: assignedRoles.map(role => ({
          id: role.id,
          name: role.name,
          description: `System role with ${role.permissions?.length || 0} permissions`,
          userCount: role._count?.users || 0,
          permissions: role.permissions?.map(rp => ({
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description,
            resource: rp.permission.resource,
            action: rp.permission.action,
            isActive: rp.permission.isActive
          })) || [],
          isActive: role.isActive
        })),
        removedRoles: removedRoles.map(role => ({
          id: role.id,
          name: role.name,
          description: `System role with ${role.permissions?.length || 0} permissions`,
          userCount: role._count?.users || 0,
          permissions: role.permissions?.map(rp => ({
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description,
            resource: rp.permission.resource,
            action: rp.permission.action,
            isActive: rp.permission.isActive
          })) || [],
          isActive: role.isActive
        })),
        activeRole: updatedUser.activeRole ? {
          id: updatedUser.activeRole.id,
          name: updatedUser.activeRole.name,
          description: `Active system role`,
          userCount: 0,
          permissions: [],
          isActive: updatedUser.activeRole.isActive
        } : null,
        changeId: `role_update_${Date.now()}`
      },
      message: 'User roles updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update user roles:', error);
    
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['User not found'],
        message: 'User with the specified ID does not exist',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to update user roles'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// DELETE /api/v1/admin/users/:id/roles/:roleId - Remove specific role from user
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id: userId } = await context.params;
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const roleId = pathSegments[pathSegments.length - 1];

    if (!roleId || roleId === 'roles') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid request'],
        message: 'Role ID is required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Get current admin user info
    const currentUser = await getCurrentUser(request);
    const adminUserId = currentUser?.id || 'unknown';
    const adminUserName = currentUser?.name || 'Unknown Admin';

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Get current user roles
    const currentUserData = await DatabaseService.listUsers({ search: userId });
    const currentUser_Data = currentUserData.users.find(u => u.id === userId);
    const currentRoleIds = currentUser_Data?.roles.map(r => r.id) || [];

    if (!currentRoleIds.includes(roleId)) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Role not assigned'],
        message: 'User does not have the specified role',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Remove the specific role
    const newRoleIds = currentRoleIds.filter(id => id !== roleId);

    // Update user roles
    const updatedUser = await DatabaseService.assignUserRoles(
      userId,
      newRoleIds,
      adminUserId,
      adminUserName,
      'Role removed via admin interface',
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      data: {
        userId,
        removedRoleId: roleId,
        remainingRoles: updatedUser.roles.map(role => ({
          id: role.id,
          name: role.name
        })),
        activeRole: updatedUser.activeRole ? {
          id: updatedUser.activeRole.id,
          name: updatedUser.activeRole.name
        } : null
      },
      message: 'Role removed successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to remove user role:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to remove user role'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}