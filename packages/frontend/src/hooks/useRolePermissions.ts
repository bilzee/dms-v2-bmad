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

  const permissions = session?.user?.permissions || [];
  const activeRoleName = session?.user?.activeRole?.name || null;
  const assignedRoles = session?.user?.assignedRoles || [];

  const hasPermission = useMemo(() => {
    return (resource: string, action: string): boolean => {
      return permissions.some(
        permission => permission.resource === resource && permission.action === action
      );
    };
  }, [permissions]);

  const hasAnyRole = useMemo(() => {
    return (roles: string[]): boolean => {
      return roles.some(role => 
        assignedRoles.some(userRole => userRole.name === role)
      );
    };
  }, [assignedRoles]);

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