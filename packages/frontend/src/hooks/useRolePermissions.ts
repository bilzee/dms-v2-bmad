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

  const hasPermission = useMemo(() => {
    return (resource: string, action: string): boolean => {
      if (!session?.user?.permissions) return false;
      
      // Handle both string and Permission object formats
      return session.user.permissions.some(permission => {
        if (typeof permission === 'string') {
          return permission === `${resource}:${action}`;
        }
        // Handle Permission object format with explicit type casting
        if (permission && typeof permission === 'object') {
          const perm = permission as { resource?: string; action?: string };
          return perm.resource === resource && perm.action === action;
        }
        return false;
      });
    };
  }, [session?.user?.permissions]);

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