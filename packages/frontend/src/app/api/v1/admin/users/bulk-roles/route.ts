import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { z } from 'zod';
import { requireAdminRole, getCurrentUser } from '@/lib/auth-middleware';
import NotificationService from '@/lib/services/NotificationService';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';





const bulkRoleAssignmentSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
  reason: z.string().optional(),
  notifyUsers: z.boolean().optional().default(false)
});

// POST /api/v1/admin/users/bulk-roles - Bulk assign roles to multiple users
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const body = await request.json();

    // Validate request data
    const validationResult = bulkRoleAssignmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Validation failed'],
        message: 'Invalid request data',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const { userIds, roleIds, reason, notifyUsers } = validationResult.data;

    // Validate user limit for bulk operations
    if (userIds.length > 50) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Bulk limit exceeded'],
        message: 'Cannot process more than 50 users in a single bulk operation'
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

    // Validate that users exist
    const existingUsers = await DatabaseService.listUsers({ 
      search: userIds.join(' '), 
      limit: 100 
    });

    const foundUserIds = existingUsers.users.map(u => u.id);
    const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));

    if (missingUserIds.length > 0) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Users not found'],
        message: `The following user IDs were not found: ${missingUserIds.join(', ')}`,
        details: { missingUserIds }
      }, { status: 404 });
    }

    // Validate that roles exist
    const allRoles = await DatabaseService.getAllRoles();
    const existingRoleIds = allRoles.map(r => r.id);
    const missingRoleIds = roleIds.filter(id => !existingRoleIds.includes(id));

    if (missingRoleIds.length > 0) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Roles not found'],
        message: `The following role IDs were not found: ${missingRoleIds.join(', ')}`,
        details: { missingRoleIds }
      }, { status: 404 });
    }

    // Perform bulk role assignment
    const results = await DatabaseService.bulkAssignRoles(
      userIds,
      roleIds,
      adminUserId,
      adminUserName,
      reason,
      ipAddress,
      userAgent
    );

    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Get role names for response
    const assignedRoles = allRoles.filter(role => roleIds.includes(role.id));

    if (notifyUsers && successful.length > 0) {
      try {
        const promises = successful.map(result => {
          if (result.user) {
            const user = { 
              id: result.user.id, 
              name: result.user.name || 'Unknown', 
              email: result.user.email || '' 
            };
            const admin = { id: adminUserId, name: adminUserName };
            
            return NotificationService.sendRoleAssignmentNotification(
              user as any,
              assignedRoles as any[],
              [], // No removed roles in bulk assignment
              admin,
              reason
            );
          }
        });
        
        await Promise.allSettled(promises);
      } catch (notificationError) {
        console.error('Failed to send bulk notifications:', notificationError);
        // Don't fail the operation if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalUsers: userIds.length,
          successfulAssignments: successful.length,
          failedAssignments: failed.length,
          assignedRoles: assignedRoles.map(role => ({
            id: role.id,
            name: role.name,
            description: `System role with ${role.permissions?.length || 0} permissions`
          }))
        },
        results: {
          successful: successful.map(result => ({
            userId: result.userId,
            success: result.success,
            user: result.user ? {
              id: result.user.id,
              name: result.user.name,
              email: result.user.email,
              currentRoles: result.user.roles?.map(r => ({
                id: r.id,
                name: r.name
              })) || []
            } : null
          })),
          failed: failed.map(result => ({
            userId: result.userId,
            success: result.success,
            error: result.error
          }))
        },
        operationId: `bulk_role_assignment_${Date.now()}`
      },
      message: `Bulk role assignment completed. ${successful.length} successful, ${failed.length} failed.`
    });

  } catch (error) {
    console.error('Failed to perform bulk role assignment:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to perform bulk role assignment'],
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
