import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import DatabaseService from '@/lib/services/DatabaseService';
import { formatRolePermissions, createApiResponse } from '@/lib/type-helpers';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

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
  let session: any = null;
  let targetRoleId: string = '';

  try {
    session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const { targetRoleId: roleId, targetRoleName, currentContext } = await request.json() as RoleSwitchRequest;
    targetRoleId = roleId;

    if (!targetRoleId || !targetRoleName) {
      return NextResponse.json(
        { success: false, errors: ['Target role ID and name are required'] },
        { status: 400 }
      );
    }

    const user = await DatabaseService.getUserWithRoles(session.user.id);

    if (!user) {
      return NextResponse.json(
        { success: false, errors: ['User not found'] },
        { status: 404 }
      );
    }

    const targetRole = user.roles.find(role => role.id === targetRoleId);
    if (!targetRole) {
      return NextResponse.json(
        { success: false, errors: ['User does not have access to this role'] },
        { status: 403 }
      );
    }

    if (targetRole.name !== targetRoleName) {
      return NextResponse.json(
        { success: false, errors: ['Role ID and name mismatch'] },
        { status: 400 }
      );
    }

    rollbackInfo = {
      previousRoleId: user.activeRoleId || '',
      timestamp: new Date().toISOString()
    };

    if (currentContext?.preferences && rollbackInfo.previousRoleId) {
      try {
        // TODO: Add DatabaseService.saveRolePreferences method when needed
        // await DatabaseService.saveRolePreferences(session.user.id, rollbackInfo.previousRoleId, currentContext.preferences);
      } catch (prefError) {
        console.warn('Failed to save role preferences:', prefError);
      }
    }

    const updatedUser = await DatabaseService.switchUserRole(session.user.id, targetRoleId);

    const activeRole = updatedUser.roles.find(role => role.id === targetRoleId);
    const permissions = (activeRole as any)?.permissions || [];

    try {
      await DatabaseService.logUserAction({
        userId: session.user.id,
        action: 'ROLE_SWITCH',
        resource: 'USER_ROLE',
        resourceId: targetRoleId,
        details: {
          fromRoleId: rollbackInfo.previousRoleId,
          toRoleId: targetRoleId,
          success: true
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
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
        permissions: formatRolePermissions(permissions)
      },
      updatedPermissions: formatRolePermissions(permissions),
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
        await DatabaseService.switchUserRole(session.user.id, rollbackInfo.previousRoleId);
        
        await DatabaseService.logUserAction({
          userId: session.user.id,
          action: 'ROLE_SWITCH_ROLLBACK',
          resource: 'USER_ROLE',
          resourceId: rollbackInfo.previousRoleId,
          details: {
            fromRoleId: targetRoleId,
            toRoleId: rollbackInfo.previousRoleId,
            success: false,
      data: null,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }).catch(() => {});
        
        console.log('Successfully rolled back role change');
      } catch (rollbackError) {
        console.error('Failed to rollback role change:', rollbackError);
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        errors: ['Internal server error during role switch'],
        rollbackInfo: rollbackInfo || undefined
      },
      { status: 500 }
    );
  }
}