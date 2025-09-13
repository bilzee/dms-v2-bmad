import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

interface UseRolePermissionsReturn {
  permissions: Permission[];
  hasPermission: (resource: string, action: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAccess: (resource: string) => boolean;
  activeRoleName: string | null;
}

export const useRolePermissions = (): UseRolePermissionsReturn => {
  const { data: session } = useSession();

  const permissions: Permission[] = session?.user?.permissions?.map(p => 
    typeof p === 'string' 
      ? { id: p, name: p, resource: p.split(':')[0], action: p.split(':')[1] }
      : p
  ) || [];
  const activeRoleName = session?.user?.activeRole?.name || null;
  const userRoles = session?.user?.roles || [];

  // Fallback permissions for demo system when database has no permissions
  const getFallbackPermissions = (roleName: string | null): string[] => {
    if (!roleName) return [];
    
    switch (roleName) {
      case 'ADMIN':
        return [
          'users:read', 'users:write', 'users:delete',
          'roles:read', 'roles:write', 'roles:delete',
          'assessments:read', 'assessments:write', 'assessments:delete',
          'responses:read', 'responses:write', 'responses:delete',
          'entities:read', 'entities:write', 'entities:delete',
          'verification:read', 'verification:approve',
          'monitoring:read', 'incidents:manage', 'config:manage'
        ];
      case 'COORDINATOR':
        return [
          'assessments:read', 'assessments:write',
          'responses:read', 'responses:write',
          'entities:read', 'entities:write',
          'verification:read', 'verification:approve',
          'monitoring:read', 'incidents:manage', 'config:manage'
        ];
      case 'ASSESSOR':
        return [
          'assessments:read', 'assessments:write',
          'entities:read'
        ];
      case 'RESPONDER':
        return [
          'responses:read', 'responses:write',
          'assessments:read'
        ];
      case 'VERIFIER':
        return [
          'verification:read', 'verification:approve',
          'assessments:read', 'responses:read'
        ];
      case 'DONOR':
        return [
          'donations:read', 'donations:write', 'donations:plan', 'donations:commit', 'donations:track',
          'responses:read'
        ];
      default:
        return [];
    }
  };

  const hasPermission = useMemo(() => {
    return (resource: string, action: string): boolean => {
      const targetPermission = `${resource}:${action}`;
      
      // First check if we have actual permissions from database
      if (session?.user?.permissions && session.user.permissions.length > 0) {
        return session.user.permissions.some(permission => {
          if (typeof permission === 'string') {
            return permission === targetPermission;
          }
          // Handle Permission object format with explicit type casting
          if (permission && typeof permission === 'object') {
            const perm = permission as { resource?: string; action?: string };
            return perm.resource === resource && perm.action === action;
          }
          return false;
        });
      }
      
      // Fallback to role-based permissions when no database permissions exist
      const fallbackPermissions = getFallbackPermissions(activeRoleName);
      return fallbackPermissions.includes(targetPermission);
    };
  }, [session?.user?.permissions, activeRoleName]);

  const hasAnyRole = useMemo(() => {
    return (roles: string[]): boolean => {
      return roles.some(role => 
        userRoles.some((userRole: any) => userRole.name === role)
      );
    };
  }, [userRoles]);

  const canAccess = useMemo(() => {
    return (resource: string): boolean => {
      return permissions.some(permission => permission.resource === resource);
    };
  }, [permissions]);

  return {
    permissions,
    hasPermission,
    hasAnyRole,
    canAccess,
    activeRoleName,
  };
};