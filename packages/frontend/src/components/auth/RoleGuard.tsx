'use client'

import { ReactNode } from 'react'
import { useRoleContext } from '@/components/providers/RoleContextProvider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: Array<{ resource: string; action: string }>;
  fallback?: ReactNode;
  showError?: boolean;
}

export function RoleGuard({ 
  children, 
  requiredRoles = [], 
  requiredPermissions = [],
  fallback,
  showError = true
}: RoleGuardProps) {
  const { hasAnyRole, hasPermission, activeRoleName } = useRoleContext();

  // Check role requirements
  const hasRequiredRole = requiredRoles.length === 0 || hasAnyRole(requiredRoles);
  
  // Check permission requirements
  const hasRequiredPermissions = requiredPermissions.length === 0 || 
    requiredPermissions.every(({ resource, action }) => hasPermission(resource, action));

  const hasAccess = hasRequiredRole && hasRequiredPermissions;

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showError) {
      return null;
    }

    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. You need {requiredRoles.length > 0 ? 
            `one of the following roles: ${requiredRoles.join(', ')}` : 
            'additional permissions'} to view this content.
          {activeRoleName && ` Current role: ${activeRoleName}`}
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}