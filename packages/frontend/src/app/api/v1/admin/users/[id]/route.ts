import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { z } from 'zod';
import { requireAdminRole, getCurrentUser } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});


interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/v1/admin/users/:id - Get user by ID
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id } = await context.params;

    const result = await DatabaseService.listUsers({ search: id });
    const user = result.users.find(u => u.id === id);

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
        user: {
          ...user,
          accountStatus: user.isActive ? 'ACTIVE' : 'INACTIVE',
          lastLogin: null // TODO: Implement last login tracking
        }
      },
      message: 'User retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch user:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch user'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// PUT /api/v1/admin/users/:id - Update user profile and roles
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id } = await context.params;
    const body = await request.json();

    // Validate request data
    const validationResult = updateUserSchema.safeParse(body);
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

    const updateData = validationResult.data;

    // TODO: Get current user info from session for audit trail
    const currentUserId = 'temp-admin-id';
    const currentUserName = 'Temp Admin';

    const updatedUser = await DatabaseService.updateUserWithAdmin(
      id,
      updateData,
      currentUserId,
      currentUserName
    );

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...updatedUser,
          accountStatus: updatedUser.isActive ? 'ACTIVE' : 'INACTIVE',
          lastLogin: null
        }
      },
      message: 'User updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update user:', error);
    
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
      errors: ['Failed to update user'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// DELETE /api/v1/admin/users/:id - Soft delete user (set inactive)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id } = await context.params;

    // TODO: Get current user info from session for audit trail
    const currentUserId = 'temp-admin-id';
    const currentUserName = 'Temp Admin';

    await DatabaseService.toggleUserStatus([id], false, currentUserId, currentUserName, 'Deleted via admin interface');

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to delete user:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to delete user'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}