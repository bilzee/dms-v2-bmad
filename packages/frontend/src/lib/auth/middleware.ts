import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, validateCrossRoleAccess, ROLE_PERMISSIONS } from './permissions';

export interface ApiAuthOptions {
  requiredRoles?: string[];
  requiredPermissions?: Array<{ resource: string; action: string }>;
  allowCrossRoleAccess?: boolean;
}

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, session: any) => Promise<NextResponse>,
  options: ApiAuthOptions = {}
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRoles = session.user.roles || [];

    // Check role requirements
    if (options.requiredRoles && options.requiredRoles.length > 0) {
      const hasRequiredRole = options.requiredRoles.some(role =>
        userRoles.some(userRole => userRole.name === role)
      );
      
      if (!hasRequiredRole) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient permissions. Required roles: ${options.requiredRoles.join(', ')}` 
          },
          { status: 403 }
        );
      }
    }

    // Check permission requirements
    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasRequiredPermissions = options.requiredPermissions.every(
        ({ resource, action }) => hasPermission(userRoles, resource, action)
      );
      
      if (!hasRequiredPermissions) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions for this action' },
          { status: 403 }
        );
      }
    }

    return handler(request, session);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication service error' },
      { status: 500 }
    );
  }
}

export function createAuthHandler(
  handler: (request: NextRequest, session: any) => Promise<NextResponse>,
  options: ApiAuthOptions = {}
) {
  return (request: NextRequest) => withAuth(request, handler, options);
}