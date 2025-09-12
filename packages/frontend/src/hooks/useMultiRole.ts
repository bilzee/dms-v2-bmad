import { useSession } from 'next-auth/react';
import { useState, useCallback, useEffect, useRef } from 'react';

interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER';
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

  const assignedRoles: UserRole[] = (session?.user?.roles || []).map(role => ({
    id: role.id,
    name: role.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER',
    permissions: [], // Initialize empty permissions - should be populated from API
    isActive: role.isActive
  }));
  const activeRole: UserRole | null = session?.user?.activeRole ? {
    id: session.user.activeRole.id,
    name: session.user.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER', // Add VERIFIER
    permissions: [], // Initialize empty - will be populated from API
    isActive: session.user.activeRole.isActive
  } : null;
  const isMultiRole = assignedRoles.length > 1;

  const getRoleContext = useCallback(async (): Promise<RoleContext | null> => {
    try {
      const response = await fetch('/api/v1/session/role');
      const result = await response.json();
      
      if (result.success) {
        const context = {
          activeRole: result.data.activeRole ? {
            id: result.data.activeRole.id,
            name: result.data.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER',
            permissions: result.data.activeRole.permissions || [],
            isActive: result.data.activeRole.isActive
          } : null,
          availableRoles: (result.data.availableRoles || []).map((role: any) => ({
            id: role.id,
            name: role.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER',
            permissions: role.permissions || [],
            isActive: role.isActive
          })),
          permissions: result.data.activeRole?.permissions || [],
          sessionData: {
            preferences: {},
            workflowState: {},
            offlineData: false
          },
          canSwitchRoles: result.data.canSwitchRoles,
          lastRoleSwitch: new Date().toISOString()
        };
        setRoleContext(context);
        return context;
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
      console.log('Role switching debug:', {
        sessionUserId: session?.user?.id,
        sessionUserName: session?.user?.name,
        targetRole: { roleId, roleName }
      });
      
      // Single unified approach: Use API endpoint for ALL users
      console.log('Using unified API endpoint method for role switching');
      
      const response = await fetch('/api/v1/session/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          roleId
        }),
      });

      const result = await response.json();
      
      console.log('API role switch response:', result);

      if (result.success) {
        // Store rollback info
        if (roleContext?.activeRole) {
          rollbackInfoRef.current = {
            previousRoleId: roleContext.activeRole.id,
            timestamp: new Date().toISOString()
          };
        }

        // Update context with new role data
        const newContext = {
          activeRole: result.data.activeRole ? {
            id: result.data.activeRole.id,
            name: result.data.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER',
            permissions: result.data.activeRole.permissions || [],
            isActive: result.data.activeRole.isActive
          } : null,
          availableRoles: (result.data.availableRoles || []).map((role: any) => ({
            id: role.id,
            name: role.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER',
            permissions: role.permissions || [],
            isActive: role.isActive
          })),
          permissions: result.data.activeRole?.permissions || [],
          sessionData: {
            preferences: currentContext?.preferences || {},
            workflowState: currentContext?.workflowState || {},
            offlineData: false
          },
          canSwitchRoles: result.data.availableRoles.length > 1,
          lastRoleSwitch: new Date().toISOString()
        };
        
        setRoleContext(newContext);
        setPerformanceMs(Date.now() - startTime);
        
        // Update NextAuth session with complete role information
        await update({
          user: {
            ...session?.user,
            activeRole: {
              id: result.data.activeRole.id,
              name: result.data.activeRole.name,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            role: result.data.activeRole.name,
            roles: result.data.availableRoles.map((role: any) => ({
              id: role.id,
              name: role.name,
              isActive: role.isActive,
              createdAt: new Date(),
              updatedAt: new Date()
            })),
            permissions: result.data.activeRole.permissions || [],
            allRoles: result.data.availableRoles.map((r: any) => r.name)
          }
        });

        // Force page refresh to ensure all components re-render with new role
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
        
        return true;
      } else {
        console.error('API role switch failed:', result);
        
        // Better error messaging
        if (result.error?.includes('authentication layer')) {
          setError('Authentication system error - please sign out and sign in again');
        } else {
          setError(result.error || 'Failed to switch role');
        }
        return false;
      }
    } catch (err) {
      console.error('Role switch error:', err);
      setError('Network error while switching role');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [update, roleContext, session]);

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