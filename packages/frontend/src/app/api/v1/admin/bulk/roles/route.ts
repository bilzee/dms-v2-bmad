import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import NotificationService from '@/lib/services/NotificationService';
import { z } from 'zod';
import { requireAdminRole, getCurrentUser } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const bulkRoleAssignmentSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user is required'),
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
  reason: z.string().optional(),
  notifyUsers: z.boolean().optional().default(false)
});

// POST /api/v1/admin/bulk/roles - Bulk assign roles to multiple users
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
        details: validationResult.error.errors,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const { userIds, roleIds, reason, notifyUsers } = validationResult.data;

    // Get current admin user info
    const currentUser = await getCurrentUser(request);
    const adminUserId = currentUser?.id || 'unknown';
    const adminUserName = currentUser?.name || 'Unknown Admin';

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

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

    // Get role details for notifications
    const allRoles = await DatabaseService.getAllRoles();
    const assignedRoles = allRoles.filter(role => roleIds.includes(role.id));

    // Send notifications if requested
    if (notifyUsers && results.successful.length > 0) {
      try {
        const usersData = await DatabaseService.listUsers({ 
          userIds: results.successful.map(r => r.userId) 
        });
        
        await NotificationService.sendBulkAssignmentNotification(
          usersData.users as any[],
          assignedRoles as any[],
          { id: adminUserId, name: adminUserName },
          reason
        );
      } catch (notificationError) {
        console.error('Failed to send bulk notifications:', notificationError);
        // Don't fail the assignment if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: userIds.length,
        successfulAssignments: results.successful.length,
        failedAssignments: results.failed.length,
        successful: results.successful.map(result => ({
          userId: result.userId,
          userName: result.userName,
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
          }))
        })),
        failed: results.failed,
        assignedRoles: assignedRoles.map(role => ({
          id: role.id,
          name: role.name
        })),
        changeId: `bulk_assignment_${Date.now()}`
      },
      message: `Bulk role assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to perform bulk role assignment:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to perform bulk role assignment'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}