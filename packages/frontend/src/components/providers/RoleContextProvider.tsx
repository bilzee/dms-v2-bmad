'use client'

import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react'
import { useMultiRole } from '@/hooks/useMultiRole'
import { useRolePermissions } from '@/hooks/useRolePermissions'

interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER';
  permissions: any[];
  isActive: boolean;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

interface RoleSessionData {
  preferences: Record<string, any>;
  workflowState: Record<string, any>;
  lastActivity: string;
  offlineData: boolean;
}

interface RoleContextValue {
  assignedRoles: UserRole[];
  activeRole: UserRole | null;
  availableRoles: UserRole[];
  isMultiRole: boolean;
  canSwitchRoles: boolean;
  switchRole: (roleId: string, roleName: string, currentContext?: { preferences?: Record<string, any>; workflowState?: Record<string, any> }) => Promise<boolean>;
  hasRole: (roleName: string) => boolean;
  isLoading: boolean;
  error: string | null;
  permissions: Permission[];
  hasPermission: (resource: string, action: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAccess: (resource: string) => boolean;
  activeRoleName: string | null;
  sessionData: RoleSessionData;
  rollbackLastSwitch: () => Promise<boolean>;
  savePreferences: (preferences: Record<string, any>) => Promise<boolean>;
  saveWorkflowState: (workflowState: Record<string, any>) => void;
  getRoleContext: () => Promise<any>;
  performanceMs: number | null;
  lastRoleSwitch?: string;
}

const RoleContext = createContext<RoleContextValue | null>(null);

interface RoleContextProviderProps {
  children: ReactNode;
}

export function RoleContextProvider({ children }: RoleContextProviderProps) {
  const multiRoleData = useMultiRole();
  const permissionData = useRolePermissions();
  const [localWorkflowState, setLocalWorkflowState] = useState<Record<string, any>>({});

  const saveWorkflowState = useCallback((workflowState: Record<string, any>) => {
    setLocalWorkflowState(prev => ({ ...prev, ...workflowState }));
    
    if (typeof window !== 'undefined' && multiRoleData.activeRole) {
      const storageKey = `workflow_state_${multiRoleData.activeRole.id}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(workflowState));
      } catch (error) {
        console.warn('Failed to save workflow state to localStorage:', error);
      }
    }
  }, [multiRoleData.activeRole]);

  useEffect(() => {
    if (typeof window !== 'undefined' && multiRoleData.activeRole) {
      const storageKey = `workflow_state_${multiRoleData.activeRole.id}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setLocalWorkflowState(JSON.parse(saved));
        }
      } catch (error) {
        console.warn('Failed to load workflow state from localStorage:', error);
      }
    }
  }, [multiRoleData.activeRole?.id]);

  const contextValue: RoleContextValue = {
    ...multiRoleData,
    ...permissionData,
    sessionData: {
      ...multiRoleData.sessionData,
      workflowState: { ...multiRoleData.sessionData.workflowState, ...localWorkflowState },
      lastActivity: new Date().toISOString()
    },
    saveWorkflowState,
  };

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRoleContext(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRoleContext must be used within a RoleContextProvider');
  }
  return context;
}