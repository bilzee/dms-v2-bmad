import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

interface RoleSwitchRequest {
  targetRoleId: string;
  targetRoleName: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  currentContext?: {
    preferences?: Record<string, any>;
    workflowState?: Record<string, any>;
  };
}

interface RoleSwitchResponse {
  success: boolean;
  newRole?: {
    id: string;
    name: string;
    permissions: Array<{ id: string; name: string; resource: string; action: string }>;
  };
  updatedPermissions?: Array<{ id: string; name: string; resource: string; action: string }>;
  sessionContext?: {
    activeRole: any;
    availableRoles: any[];
    permissions: any[];
    sessionData: {
      preferences: Record<string, any>;
      workflowState: Record<string, any>;
      offlineData: boolean;
    };
  };
  error?: string;
  rollbackInfo?: {
    previousRoleId: string;
    timestamp: string;
  };
  performanceMs?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse<RoleSwitchResponse>> {
  const startTime = Date.now();
  let rollbackInfo: { previousRoleId: string; timestamp: string } | null = null;

  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { targetRoleId, targetRoleName, currentContext } = await request.json() as RoleSwitchRequest;

    if (!targetRoleId || !targetRoleName) {
      return NextResponse.json(
        { success: false, error: 'Target role ID and name are required' },
        { status: 400 }
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
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const targetRole = user.roles.find(role => role.id === targetRoleId);
    if (!targetRole) {
      return NextResponse.json(
        { success: false, error: 'User does not have access to this role' },
        { status: 403 }
      );
    }

    if (targetRole.name !== targetRoleName) {
      return NextResponse.json(
        { success: false, error: 'Role ID and name mismatch' },
        { status: 400 }
      );
    }

    rollbackInfo = {
      previousRoleId: user.activeRoleId || '',
      timestamp: new Date().toISOString()
    };

    if (currentContext?.preferences && rollbackInfo.previousRoleId) {
      try {
        await prisma.userRolePreferences.upsert({
          where: {
            userId_roleId: {
              userId: session.user.id,
              roleId: rollbackInfo.previousRoleId
            }
          },
          update: {
            preferences: currentContext.preferences,
            updatedAt: new Date()
          },
          create: {
            userId: session.user.id,
            roleId: rollbackInfo.previousRoleId,
            preferences: currentContext.preferences
          }
        });
      } catch (prefError) {
        console.warn('Failed to save role preferences:', prefError);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        activeRoleId: targetRoleId,
        lastRoleSwitch: new Date()
      },
      include: {
        roles: {
          include: {
            permissions: true
          }
        }
      }
    });

    const activeRole = updatedUser.roles.find(role => role.id === targetRoleId);
    const permissions = activeRole?.permissions || [];

    try {
      await prisma.roleAuditLog.create({
        data: {
          userId: session.user.id,
          fromRoleId: rollbackInfo.previousRoleId,
          toRoleId: targetRoleId,
          timestamp: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: true
        }
      });
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
    }

    const elapsedTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      newRole: {
        id: activeRole?.id || targetRoleId,
        name: targetRoleName,
        permissions: permissions.map(p => ({
          id: p.id,
          name: p.name,
          resource: p.resource,
          action: p.action
        }))
      },
      updatedPermissions: permissions.map(p => ({
        id: p.id,
        name: p.name,
        resource: p.resource,
        action: p.action
      })),
      sessionContext: {
        activeRole: activeRole,
        availableRoles: updatedUser.roles,
        permissions: permissions,
        sessionData: {
          preferences: currentContext?.preferences || {},
          workflowState: currentContext?.workflowState || {},
          offlineData: true
        }
      },
      performanceMs: elapsedTime
    } as RoleSwitchResponse);

  } catch (error) {
    console.error('Error switching role:', error);
    
    if (rollbackInfo && session?.user?.id) {
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { activeRoleId: rollbackInfo.previousRoleId },
        });
        
        await prisma.roleAuditLog.create({
          data: {
            userId: session.user.id,
            fromRoleId: rollbackInfo.previousRoleId,
            toRoleId: targetRoleId,
            timestamp: new Date(),
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        }).catch(() => {});
        
        console.log('Successfully rolled back role change');
      } catch (rollbackError) {
        console.error('Failed to rollback role change:', rollbackError);
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during role switch',
        rollbackInfo: rollbackInfo
      },
      { status: 500 }
    );
  }
}