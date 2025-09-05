import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { z } from 'zod';
import { requireAuth, getCurrentUser } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const switchRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required')
});

// GET /api/v1/session/role - Get current user's role session information
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        message: 'Unable to find current user session',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Get user with roles from database
    const userData = await DatabaseService.listUsers({ search: currentUser.id });
    const user = userData.users.find(u => u.id === currentUser.id);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        message: 'User data not found in database',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Format response
    const sessionData = {
      userId: user.id,
      availableRoles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: `System role with permissions`,
        permissions: role.permissions?.map(rp => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
          resource: rp.permission.resource,
          action: rp.permission.action
        })) || [],
        isActive: role.id === user.activeRoleId,
        userCount: 0
      })),
      activeRole: user.activeRole ? {
        id: user.activeRole.id,
        name: user.activeRole.name,
        description: `Active system role`,
        permissions: user.roles
          .find(r => r.id === user.activeRole?.id)
          ?.permissions?.map(rp => ({
            id: rp.permission.id,
            name: rp.permission.name,
            description: rp.permission.description,
            resource: rp.permission.resource,
            action: rp.permission.action
          })) || [],
        isActive: true,
        userCount: 0
      } : null,
      canSwitchRoles: user.roles.length > 1
    };

    return NextResponse.json({
      success: true,
      data: sessionData,
      message: 'User session data retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch user session:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user session',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// PUT /api/v1/session/role - Switch active role for current user
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        message: 'Unable to find current user session',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    const body = await request.json();

    // Validate request data
    const validationResult = switchRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid request data',
        details: validationResult.error.errors,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const { roleId } = validationResult.data;

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Switch active role (self-service)
    const updatedUser = await DatabaseService.setActiveRole(
      currentUser.id,
      roleId,
      currentUser.id, // User is switching their own role
      currentUser.name,
      ipAddress,
      userAgent
    );

    // Format response
    const responseData = {
      userId: updatedUser.id,
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
        isActive: true,
        userCount: 0
      } : null,
      availableRoles: updatedUser.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: `System role`,
        permissions: role.permissions?.map(rp => ({
          id: rp.permission.id,
          name: rp.permission.name,
          description: rp.permission.description,
          resource: rp.permission.resource,
          action: rp.permission.action
        })) || [],
        isActive: role.id === updatedUser.activeRoleId,
        userCount: 0
      })),
      previousRole: currentUser.activeRole
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Active role switched successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to switch role:', error);
    
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'User does not have the specified role') {
      return NextResponse.json({
        success: false,
        error: 'Invalid role',
        message: 'You do not have the specified role assigned',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to switch role',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}