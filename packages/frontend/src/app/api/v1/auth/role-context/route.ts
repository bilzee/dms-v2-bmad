import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { formatRolePermissions, handleMissingTable, createApiResponse } from '@/lib/type-helpers';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface RoleContext {
  activeRole: {
    id: string;
    name: string;
    permissions: Array<{ id: string; name: string; resource: string; action: string }>;
  } | null;
  availableRoles: Array<{
    id: string;
    name: string;
    permissions: Array<{ id: string; name: string; resource: string; action: string }>;
  }>;
  permissions: Array<{ id: string; name: string; resource: string; action: string }>;
  sessionData: {
    preferences: Record<string, any>;
    workflowState: Record<string, any>;
    offlineData: boolean;
  };
  canSwitchRoles: boolean;
  lastRoleSwitch?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<{ success: boolean; context?: RoleContext; error?: string }>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        roles: {
          include: {
            permissions: true
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, errors: ['User not found'] },
        { status: 404 }
      );
    }

    const activeRole = user.roles.find(role => role.id === user.activeRoleId);
    const activePermissions = activeRole?.permissions || [];

    // TODO: Implement user role preferences when schema is available
    let rolePreferences = {};

    const context: RoleContext = {
      activeRole: activeRole ? {
        id: activeRole.id,
        name: activeRole.name,
        permissions: formatRolePermissions(activePermissions)
      } : null,
      availableRoles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        permissions: formatRolePermissions(role.permissions)
      })),
      permissions: formatRolePermissions(activePermissions),
      sessionData: {
        preferences: rolePreferences,
        workflowState: {},
        offlineData: true
      },
      canSwitchRoles: user.roles.length > 1,
      lastRoleSwitch: (user as any).lastRoleSwitch?.toISOString() || null
    };

    return NextResponse.json({
      success: true,
      context
    });

  } catch (error) {
    console.error('Error getting role context:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}