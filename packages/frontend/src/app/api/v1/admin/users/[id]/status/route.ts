import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { z } from 'zod';
import { requireAdminRole, getCurrentUser } from '@/lib/auth-middleware';

const statusUpdateSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().optional()
});


interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/v1/admin/users/:id/status - Activate/deactivate account
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id } = await context.params;
    const body = await request.json();

    // Validate request data
    const validationResult = statusUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid request data',
        details: validationResult.error.errors,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const { isActive, reason } = validationResult.data;

    // TODO: Get current user info from session for audit trail
    const currentUserId = 'temp-admin-id';
    const currentUserName = 'Temp Admin';

    await DatabaseService.toggleUserStatus([id], isActive, currentUserId, currentUserName, reason);

    // Get updated user for response
    const result = await DatabaseService.listUsers({ search: id });
    const user = result.users.find(u => u.id === id);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          accountStatus: user.isActive ? 'ACTIVE' : 'INACTIVE',
          lastLogin: null
        }
      },
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update user status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update user status',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}