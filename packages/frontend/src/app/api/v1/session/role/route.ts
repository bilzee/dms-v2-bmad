import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { formatRolePermissions } from '@/lib/type-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

console.log('API route registered: /api/v1/session/role');

const switchRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required')
});

// GET /api/v1/session/role - Get current user's role session information
export async function GET(request: NextRequest) {
  console.log('GET /api/v1/session/role - Route handler called');
  
  try {
    const session = await auth();
    console.log('Session result:', session ? 'Found' : 'Not found');
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Querying database for user ID:', session.user.id);

    // Get user with roles from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        roles: {
          include: { 
            permissions: {
              include: { permission: true }
            }
          }
        }
      },
    });

    console.log('Database user query result:', user ? 'User found' : 'User NOT found');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found - authentication layer issue' },
        { status: 404 }
      );
    }

    const activeRole = user.roles.find(role => role.id === user.activeRoleId);
    const activePermissions = activeRole?.permissions || [];

    const sessionData = {
      activeRole: activeRole ? {
        id: activeRole.id,
        name: activeRole.name,
        permissions: formatRolePermissions(activePermissions),
        isActive: true
      } : null,
      availableRoles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        permissions: formatRolePermissions(role.permissions),
        isActive: role.id === user.activeRoleId
      })),
      canSwitchRoles: user.roles.length > 1
    };

    return NextResponse.json({
      success: true,
      data: sessionData
    });

  } catch (error) {
    console.error('Failed to fetch user session:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/v1/session/role - Switch active role for current user
export async function PUT(request: NextRequest) {
  console.log('PUT /api/v1/session/role - Route handler called');
  
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = switchRoleSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { roleId } = validationResult.data;
    console.log('Switching to role ID:', roleId);

    // Get user and verify role access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        roles: {
          include: { 
            permissions: {
              include: { permission: true }
            }
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found - authentication layer issue' },
        { status: 404 }
      );
    }

    const targetRole = user.roles.find(role => role.id === roleId);
    if (!targetRole) {
      console.log('Available role IDs:', user.roles.map(r => r.id));
      console.log('Requested role ID:', roleId);
      return NextResponse.json(
        { success: false, error: 'Role not available for this user' },
        { status: 403 }
      );
    }

    // Update user's active role
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        activeRole: {
          connect: { id: roleId }
        }
      },
      include: { 
        roles: {
          include: { 
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    // Return updated role data
    const newActiveRole = updatedUser.roles.find(role => role.id === roleId);
    const responseData = {
      activeRole: newActiveRole ? {
        id: newActiveRole.id,
        name: newActiveRole.name,
        permissions: formatRolePermissions(newActiveRole.permissions),
        isActive: true
      } : null,
      availableRoles: updatedUser.roles.map(role => ({
        id: role.id,
        name: role.name,
        permissions: formatRolePermissions(role.permissions),
        isActive: role.id === roleId
      })),
      canSwitchRoles: updatedUser.roles.length > 1
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Failed to switch role:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}