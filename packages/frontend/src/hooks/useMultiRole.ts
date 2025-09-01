import { useSession } from 'next-auth/react';
import { useState, useCallback, useEffect, useRef } from 'react';

interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  permissions: Permission[];
  isActive: boolean;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

interface RoleContext {
  activeRole: UserRole | null;
  availableRoles: UserRole[];
  permissions: Permission[];
  sessionData: {
    preferences: Record<string, any>;
    workflowState: Record<string, any>;
    offlineData: boolean;
  };
  canSwitchRoles: boolean;
  lastRoleSwitch?: string;
}

interface UseMultiRoleReturn extends RoleContext {
  assignedRoles: UserRole[];
  isMultiRole: boolean;
  switchRole: (roleId: string, roleName: string, currentContext?: { preferences?: Record<string, any>; workflowState?: Record<string, any> }) => Promise<boolean>;
  hasRole: (roleName: string) => boolean;
  isLoading: boolean;
  error: string | null;
  rollbackLastSwitch: () => Promise<boolean>;
  savePreferences: (preferences: Record<string, any>) => Promise<boolean>;
  getRoleContext: () => Promise<RoleContext | null>;
  performanceMs: number | null;
}

export const useMultiRole = (): UseMultiRoleReturn => {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleContext, setRoleContext] = useState<RoleContext | null>(null);
  const [performanceMs, setPerformanceMs] = useState<number | null>(null);
  const rollbackInfoRef = useRef<{ previousRoleId: string; timestamp: string } | null>(null);

  const assignedRoles = session?.user?.assignedRoles || [];
  const activeRole = session?.user?.activeRole || null;
  const isMultiRole = assignedRoles.length > 1;

  const getRoleContext = useCallback(async (): Promise<RoleContext | null> => {
    try {
      const response = await fetch('/api/v1/auth/role-context');
      const result = await response.json();
      
      if (result.success) {
        setRoleContext(result.context);
        return result.context;
      } else {
        setError(result.error || 'Failed to get role context');
        return null;
      }
    } catch (err) {
      setError('Network error while getting role context');
      return null;
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      getRoleContext();
    }
  }, [session?.user?.id, getRoleContext]);

  const switchRole = useCallback(async (
    roleId: string, 
    roleName: string, 
    currentContext?: { preferences?: Record<string, any>; workflowState?: Record<string, any> }
  ): Promise<boolean> => {
    const startTime = Date.now();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          targetRoleId: roleId, 
          targetRoleName: roleName,
          currentContext 
        }),
      });

      const result = await response.json();

      if (result.success) {
        rollbackInfoRef.current = result.rollbackInfo || null;
        setRoleContext(result.sessionContext);
        setPerformanceMs(result.performanceMs || Date.now() - startTime);
        
        await update();
        return true;
      } else {
        setError(result.error || 'Failed to switch role');
        rollbackInfoRef.current = result.rollbackInfo || null;
        return false;
      }
    } catch (err) {
      setError('Network error while switching role');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [update]);

  const rollbackLastSwitch = useCallback(async (): Promise<boolean> => {
    if (!rollbackInfoRef.current) {
      setError('No role switch to rollback');
      return false;
    }

    const { previousRoleId } = rollbackInfoRef.current;
    const previousRole = assignedRoles.find(role => role.id === previousRoleId);
    
    if (!previousRole) {
      setError('Cannot rollback to previous role');
      return false;
    }

    return await switchRole(previousRoleId, previousRole.name);
  }, [assignedRoles, switchRole]);

  const savePreferences = useCallback(async (preferences: Record<string, any>): Promise<boolean> => {
    if (!activeRole) {
      setError('No active role to save preferences for');
      return false;
    }

    try {
      const response = await fetch('/api/v1/auth/role-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          roleId: activeRole.id, 
          preferences 
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (roleContext) {
          setRoleContext({
            ...roleContext,
            sessionData: {
              ...roleContext.sessionData,
              preferences: result.preferences || preferences
            }
          });
        }
        return true;
      } else {
        setError(result.error || 'Failed to save preferences');
        return false;
      }
    } catch (err) {
      setError('Network error while saving preferences');
      return false;
    }
  }, [activeRole, roleContext]);

  const hasRole = useCallback((roleName: string): boolean => {
    return assignedRoles.some(role => role.name === roleName);
  }, [assignedRoles]);

  return {
    assignedRoles,
    activeRole: roleContext?.activeRole || activeRole,
    availableRoles: roleContext?.availableRoles || assignedRoles,
    permissions: roleContext?.permissions || [],
    sessionData: roleContext?.sessionData || {
      preferences: {},
      workflowState: {},
      offlineData: true
    },
    canSwitchRoles: roleContext?.canSwitchRoles ?? isMultiRole,
    lastRoleSwitch: roleContext?.lastRoleSwitch,
    isMultiRole,
    switchRole,
    hasRole,
    isLoading,
    error,
    rollbackLastSwitch,
    savePreferences,
    getRoleContext,
    performanceMs,
  };
};