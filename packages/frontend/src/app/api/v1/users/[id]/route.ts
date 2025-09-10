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

// GET /api/v1/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id: userId } = await params;

    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid user ID'],
        message: 'User ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Get user details from database
    const user = await DatabaseService.getUserWithRoles(userId);

    if (!user) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['User not found'],
        message: `No user found with ID: ${userId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          roles: user.roles.map(role => ({
            id: role.id,
            name: role.name,
            isActive: role.isActive
          })),
          activeRole: user.activeRole ? {
            id: user.activeRole.id,
            name: user.activeRole.name
          } : null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      },
      message: 'User details retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch user details:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch user details'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// PATCH /api/v1/users/[id] - Update user details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id: userId } = await params;
    const updates = await request.json();

    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid user ID'],
        message: 'User ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await DatabaseService.getUserWithRoles(userId);
    if (!existingUser) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['User not found'],
        message: `No user found with ID: ${userId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Validate email format if provided
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return NextResponse.json({
          success: false,
      data: null,
          errors: ['Invalid email format'],
          message: 'Please provide a valid email address',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
    }

    // Update user in database
    const updatedUser = await DatabaseService.updateUser(userId, updates);

    // Log the user update
    await DatabaseService.logUserAction({
      userId: userId,
      action: 'UPDATE_USER',
      resource: 'USER',
      details: { updates, targetUserId: userId }
    } as any);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          isActive: updatedUser.isActive,
          roles: updatedUser.roles.map(role => ({
            id: role.id,
            name: role.name,
            isActive: role.isActive
          })),
          activeRole: updatedUser.activeRole ? {
            id: updatedUser.activeRole.id,
            name: updatedUser.activeRole.name
          } : null,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      },
      message: 'User updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update user:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid JSON in request body'],
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check for unique constraint violation (duplicate email)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Email already exists'],
        message: 'A user with this email address already exists',
        timestamp: new Date().toISOString(),
      }, { status: 409 });
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

// DELETE /api/v1/users/[id] - Delete user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { id: userId } = await params;

    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid user ID'],
        message: 'User ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await DatabaseService.getUserWithRoles(userId);
    if (!existingUser) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['User not found'],
        message: `No user found with ID: ${userId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Perform soft delete
    await DatabaseService.deleteUser(userId);

    // Log the user deletion
    await DatabaseService.logUserAction({
      userId: userId,
      action: 'DELETE_USER',
      resource: 'USER',
      details: { deletedUserId: userId },
    } as any);

    return NextResponse.json({
      success: true,
      data: {
        userId,
        deletedAt: new Date(),
      },
      message: 'User deleted successfully',
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