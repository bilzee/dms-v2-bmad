import { useMemo, useCallback, useEffect } from 'react';
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { useRoleContext } from '@/components/providers/RoleContextProvider';

interface RoleInterface {
  roleId: string;
  roleName: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  navigation: NavigationConfig;
  dashboard: DashboardConfig;
  forms: FormConfig;
  preferences: Record<string, any>;
}

interface NavigationConfig {
  primaryMenuItems: string[];
  secondaryMenuItems?: string[];
  quickActions?: QuickAction[];
  hiddenSections?: string[];
  customOrder?: string[];
}

interface DashboardConfig {
  layout: 'single-column' | 'two-column' | 'three-column' | 'grid';
  widgets: DashboardWidget[];
  defaultFilters?: Record<string, any>;
  refreshInterval?: number;
  pinnedWidgets?: string[];
  hiddenWidgets?: string[];
}

interface FormConfig {
  conditionalFields: Record<string, string[]>;
  defaultValues: Record<string, any>;
  validationRules: Record<string, any>;
  fieldVisibility: Record<string, boolean>;
  fieldOrder?: Record<string, string[]>;
  requiredFields?: Record<string, string[]>;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  requiredPermissions: string[];
}

interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'list' | 'map' | 'activity';
  title: string;
  dataSource: string;
  refreshable: boolean;
  minimizable: boolean;
  requiredPermissions: string[];
  position?: { x: number; y: number; w: number; h: number };
  priority?: number;
}

interface RoleInterfaceState {
  interfaces: Record<string, RoleInterface>;
  currentInterfaceId: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface RoleInterfaceActions {
  setInterface: (roleId: string, config: Partial<RoleInterface>) => void;
  updatePreferences: (roleId: string, preferences: Record<string, any>) => Promise<boolean>;
  resetInterface: (roleId: string) => void;
  setCurrentInterface: (roleId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type RoleInterfaceStore = RoleInterfaceState & RoleInterfaceActions;

const useRoleInterfaceStore = create<RoleInterfaceStore>()(
  devtools(
    persist(
      (set, get) => ({
        interfaces: {},
        currentInterfaceId: null,
        isLoading: false,
        error: null,
        lastUpdated: null,

        setInterface: (roleId, config) =>
          set((state) => ({
            interfaces: {
              ...state.interfaces,
              [roleId]: {
                ...getDefaultInterfaceConfig(roleId),
                ...state.interfaces[roleId],
                ...config,
                roleId,
              },
            },
            lastUpdated: new Date().toISOString(),
          })),

        updatePreferences: async (roleId, preferences) => {
          try {
            set({ isLoading: true, error: null });
            
            const response = await fetch('/api/v1/auth/role-interface/preferences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roleId, preferences }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to save preferences');
            }
            
            set((state) => ({
              interfaces: {
                ...state.interfaces,
                [roleId]: {
                  ...state.interfaces[roleId],
                  preferences: { ...state.interfaces[roleId]?.preferences, ...preferences },
                },
              },
              isLoading: false,
              lastUpdated: new Date().toISOString(),
            }));
            
            return true;
          } catch (error) {
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
            return false;
          }
        },

        resetInterface: (roleId) =>
          set((state) => ({
            interfaces: {
              ...state.interfaces,
              [roleId]: getDefaultInterfaceConfig(roleId),
            },
            lastUpdated: new Date().toISOString(),
          })),

        setCurrentInterface: (roleId) =>
          set({ currentInterfaceId: roleId }),

        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'role-interface-storage',
        partialize: (state) => ({
          interfaces: state.interfaces,
          lastUpdated: state.lastUpdated,
        }),
      },
    ),
    { name: 'role-interface-store' },
  ),
);

function getDefaultInterfaceConfig(roleId: string): RoleInterface {
  const roleName = roleId.split('_')[0] as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  
  const baseConfig: RoleInterface = {
    roleId,
    roleName,
    navigation: {
      primaryMenuItems: [],
      quickActions: [],
      hiddenSections: [],
    },
    dashboard: {
      layout: 'two-column',
      widgets: [],
      refreshInterval: 30000,
      pinnedWidgets: [],
      hiddenWidgets: [],
    },
    forms: {
      conditionalFields: {},
      defaultValues: {},
      validationRules: {},
      fieldVisibility: {},
      fieldOrder: {
        assessment: ['type', 'location', 'severity', 'description', 'internal-notes'],
        response: ['type', 'priority', 'location', 'resources', 'notes'],
        incident: ['type', 'severity', 'location', 'description', 'response-plan'],
      },
    },
    preferences: {},
  };

  switch (roleName) {
    case 'ASSESSOR':
      return {
        ...baseConfig,
        navigation: {
          primaryMenuItems: ['Assessment Types', 'Assessment Management'],
          quickActions: [
            { id: 'new-health-assessment', label: 'New Health Assessment', icon: 'Heart', action: '/assessments/new?type=HEALTH', requiredPermissions: ['assessments:create'] },
            { id: 'emergency-report', label: 'Emergency Report', icon: 'AlertTriangle', action: '/assessments/new?type=PRELIMINARY', requiredPermissions: ['assessments:create'] },
          ],
        },
        dashboard: {
          layout: 'three-column',
          widgets: [
            { id: 'active-assessments', type: 'metric', title: 'Active Assessments', dataSource: '/api/assessments/active', refreshable: true, minimizable: false, requiredPermissions: ['assessments:read'], priority: 1 },
            { id: 'emergency-reports', type: 'metric', title: 'Emergency Reports', dataSource: '/api/assessments/emergency', refreshable: true, minimizable: false, requiredPermissions: ['assessments:read'], priority: 2 },
            { id: 'entities-assessed', type: 'metric', title: 'Entities Assessed', dataSource: '/api/entities/assessed', refreshable: true, minimizable: false, requiredPermissions: ['entities:read'], priority: 3 },
            { id: 'recent-activity', type: 'activity', title: 'Recent Activity', dataSource: '/api/activity/recent', refreshable: true, minimizable: true, requiredPermissions: ['assessments:read'], priority: 4 },
          ],
          refreshInterval: 15000,
        },
      };

    case 'COORDINATOR':
      return {
        ...baseConfig,
        navigation: {
          primaryMenuItems: ['Verification Dashboard', 'Review Management', 'Incident Management', 'Donor Coordination', 'System Configuration', 'Monitoring Tools'],
          quickActions: [
            { id: 'verify-assessment', label: 'Verify Assessment', icon: 'CheckCircle', action: '/verification/queue', requiredPermissions: ['verification:read'] },
            { id: 'incident-response', label: 'Incident Response', icon: 'AlertTriangle', action: '/coordinator/incidents', requiredPermissions: ['incidents:manage'] },
            { id: 'donor-coordination', label: 'Donor Coordination', icon: 'HandHeart', action: '/coordinator/donors', requiredPermissions: ['donors:coordinate'] },
          ],
        },
        dashboard: {
          layout: 'grid',
          widgets: [
            { id: 'verification-queue', type: 'metric', title: 'Verification Queue', dataSource: '/api/verification/queue/count', refreshable: true, minimizable: false, requiredPermissions: ['verification:read'], priority: 1 },
            { id: 'active-incidents', type: 'metric', title: 'Active Incidents', dataSource: '/api/incidents/active/count', refreshable: true, minimizable: false, requiredPermissions: ['incidents:manage'], priority: 2 },
            { id: 'donor-commitments', type: 'metric', title: 'Donor Commitments', dataSource: '/api/donors/commitments/count', refreshable: true, minimizable: false, requiredPermissions: ['donors:coordinate'], priority: 3 },
            { id: 'system-conflicts', type: 'metric', title: 'System Conflicts', dataSource: '/api/system/conflicts/count', refreshable: true, minimizable: false, requiredPermissions: ['conflicts:resolve'], priority: 4 },
            { id: 'coordination-map', type: 'map', title: 'Coordination Overview', dataSource: '/api/monitoring/map', refreshable: true, minimizable: true, requiredPermissions: ['monitoring:read'], priority: 5 },
            { id: 'performance-metrics', type: 'chart', title: 'Performance Metrics', dataSource: '/api/monitoring/performance', refreshable: true, minimizable: true, requiredPermissions: ['monitoring:read'], priority: 6 },
          ],
          refreshInterval: 10000,
        },
      };

    case 'RESPONDER':
      return {
        ...baseConfig,
        navigation: {
          primaryMenuItems: ['Response Planning', 'Delivery Management'],
          quickActions: [
            { id: 'plan-response', label: 'Plan Response', icon: 'FileText', action: '/responses/plan', requiredPermissions: ['responses:plan'] },
            { id: 'track-delivery', label: 'Track Delivery', icon: 'Truck', action: '/responses/status-review', requiredPermissions: ['responses:track'] },
          ],
        },
        dashboard: {
          layout: 'three-column',
          widgets: [
            { id: 'response-plans', type: 'metric', title: 'Response Plans', dataSource: '/api/responses/plans/count', refreshable: true, minimizable: false, requiredPermissions: ['responses:read'], priority: 1 },
            { id: 'in-transit', type: 'metric', title: 'In Transit', dataSource: '/api/responses/transit/count', refreshable: true, minimizable: false, requiredPermissions: ['responses:track'], priority: 2 },
            { id: 'completed-deliveries', type: 'metric', title: 'Completed Deliveries', dataSource: '/api/responses/completed/count', refreshable: true, minimizable: false, requiredPermissions: ['responses:read'], priority: 3 },
            { id: 'delivery-timeline', type: 'chart', title: 'Delivery Timeline', dataSource: '/api/responses/timeline', refreshable: true, minimizable: true, requiredPermissions: ['responses:read'], priority: 4 },
          ],
          refreshInterval: 20000,
        },
      };

    case 'DONOR':
      return {
        ...baseConfig,
        navigation: {
          primaryMenuItems: ['Contribution Tracking'],
          quickActions: [
            { id: 'make-commitment', label: 'Make Commitment', icon: 'Plus', action: '/donor/commitments/new', requiredPermissions: ['donations:commit'] },
            { id: 'view-impact', label: 'View Impact', icon: 'BarChart3', action: '/donor/performance', requiredPermissions: ['donations:track'] },
          ],
        },
        dashboard: {
          layout: 'three-column',
          widgets: [
            { id: 'active-commitments', type: 'metric', title: 'Active Commitments', dataSource: '/api/donations/active/count', refreshable: true, minimizable: false, requiredPermissions: ['donations:track'], priority: 1 },
            { id: 'delivery-progress', type: 'metric', title: 'Delivery Progress', dataSource: '/api/donations/progress', refreshable: true, minimizable: false, requiredPermissions: ['donations:track'], priority: 2 },
            { id: 'impact-metrics', type: 'metric', title: 'Impact Metrics', dataSource: '/api/donations/impact', refreshable: true, minimizable: false, requiredPermissions: ['donations:track'], priority: 3 },
            { id: 'donation-history', type: 'chart', title: 'Donation History', dataSource: '/api/donations/history', refreshable: true, minimizable: true, requiredPermissions: ['donations:track'], priority: 4 },
          ],
          refreshInterval: 60000,
        },
      };

    case 'ADMIN':
      return {
        ...baseConfig,
        navigation: {
          primaryMenuItems: ['System Administration'],
          quickActions: [
            { id: 'user-management', label: 'User Management', icon: 'Users', action: '/admin/users', requiredPermissions: ['users:manage'] },
            { id: 'system-monitoring', label: 'System Monitoring', icon: 'Activity', action: '/admin/monitoring', requiredPermissions: ['system:monitor'] },
            { id: 'audit-logs', label: 'Audit Logs', icon: 'FileText', action: '/admin/audit', requiredPermissions: ['audit:read'] },
          ],
        },
        dashboard: {
          layout: 'grid',
          widgets: [
            { id: 'active-users', type: 'metric', title: 'Active Users', dataSource: '/api/admin/users/active', refreshable: true, minimizable: false, requiredPermissions: ['users:view'], priority: 1 },
            { id: 'system-health', type: 'metric', title: 'System Health', dataSource: '/api/admin/system/health', refreshable: true, minimizable: false, requiredPermissions: ['system:monitor'], priority: 2 },
            { id: 'data-sync', type: 'metric', title: 'Data Sync', dataSource: '/api/admin/system/sync', refreshable: true, minimizable: false, requiredPermissions: ['system:monitor'], priority: 3 },
            { id: 'security-events', type: 'metric', title: 'Security Events', dataSource: '/api/admin/security/events', refreshable: true, minimizable: false, requiredPermissions: ['audit:read'], priority: 4 },
            { id: 'system-performance', type: 'chart', title: 'System Performance', dataSource: '/api/admin/system/performance', refreshable: true, minimizable: true, requiredPermissions: ['system:monitor'], priority: 5 },
            { id: 'user-activity', type: 'activity', title: 'User Activity', dataSource: '/api/admin/users/activity', refreshable: true, minimizable: true, requiredPermissions: ['users:view'], priority: 6 },
          ],
          refreshInterval: 5000,
        },
      };

    default:
      return baseConfig;
  }
}

export interface UseRoleInterfaceReturn {
  currentInterface: RoleInterface | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (preferences: Record<string, any>) => Promise<boolean>;
  resetInterface: () => void;
  getWidgetsByPriority: () => DashboardWidget[];
  getVisibleNavigation: () => NavigationConfig;
  isFieldVisible: (formType: string, fieldName: string) => boolean;
  getFieldOrder: (formType: string) => string[];
  hasWidgetAccess: (widgetId: string) => boolean;
  canPerformQuickAction: (actionId: string) => boolean;
  refreshInterface: () => Promise<void>;
}

export const useRoleInterface = (): UseRoleInterfaceReturn => {
  const { activeRole, hasPermission } = useRoleContext();
  const store = useRoleInterfaceStore();

  const currentRoleId = activeRole?.id;
  const currentRoleName = activeRole?.name;

  // Get or create interface configuration for current role
  const currentInterface = useMemo(() => {
    if (!currentRoleId || !currentRoleName) return null;

    if (!store.interfaces[currentRoleId]) {
      const defaultConfig = getDefaultInterfaceConfig(currentRoleId);
      store.setInterface(currentRoleId, defaultConfig);
      return defaultConfig;
    }

    return store.interfaces[currentRoleId];
  }, [currentRoleId, currentRoleName, store.interfaces, store.setInterface, store]);

  // Update interface when role changes
  useEffect(() => {
    if (currentRoleId && currentRoleId !== store.currentInterfaceId) {
      store.setCurrentInterface(currentRoleId);
    }
  }, [currentRoleId, store.currentInterfaceId, store.setCurrentInterface]);

  const updatePreferences = useCallback(async (preferences: Record<string, any>) => {
    if (!currentRoleId) return false;
    return await store.updatePreferences(currentRoleId, preferences);
  }, [currentRoleId, store.updatePreferences, store]);

  const resetInterface = useCallback(() => {
    if (currentRoleId) {
      store.resetInterface(currentRoleId);
    }
  }, [currentRoleId, store.resetInterface, store]);

  const getWidgetsByPriority = useCallback((): DashboardWidget[] => {
    if (!currentInterface) return [];
    
    return currentInterface.dashboard.widgets
      .filter(widget => {
        if (currentInterface.dashboard.hiddenWidgets?.includes(widget.id)) return false;
        return widget.requiredPermissions.every(permission => {
          const [resource, action] = permission.split(':');
          return hasPermission(resource, action);
        });
      })
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }, [currentInterface, hasPermission]);

  const getVisibleNavigation = useCallback((): NavigationConfig => {
    if (!currentInterface) {
      return { primaryMenuItems: [], quickActions: [], hiddenSections: [] };
    }

    const config = currentInterface.navigation;
    return {
      ...config,
      quickActions: config.quickActions?.filter(action =>
        action.requiredPermissions.every(permission => {
          const [resource, action] = permission.split(':');
          return hasPermission(resource, action);
        })
      ) || [],
    };
  }, [currentInterface, hasPermission]);

  const isFieldVisible = useCallback((formType: string, fieldName: string): boolean => {
    if (!currentInterface) return true;
    
    const fieldVisibility = currentInterface.forms.fieldVisibility[`${formType}-${fieldName}`];
    if (fieldVisibility === undefined) return true;
    
    // Check if field requires permissions
    if (fieldName === 'internal-notes') {
      return hasPermission('assessments', 'write-internal');
    }
    
    return fieldVisibility;
  }, [currentInterface, hasPermission]);

  const getFieldOrder = useCallback((formType: string): string[] => {
    if (!currentInterface) return [];
    
    return currentInterface.forms.fieldOrder?.[formType] || [];
  }, [currentInterface]);

  const hasWidgetAccess = useCallback((widgetId: string): boolean => {
    if (!currentInterface) return false;
    
    const widget = currentInterface.dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) return false;
    
    return widget.requiredPermissions.every(permission => {
      const [resource, action] = permission.split(':');
      return hasPermission(resource, action);
    });
  }, [currentInterface, hasPermission]);

  const canPerformQuickAction = useCallback((actionId: string): boolean => {
    if (!currentInterface) return false;
    
    const action = currentInterface.navigation.quickActions?.find(a => a.id === actionId);
    if (!action) return false;
    
    return action.requiredPermissions.every(permission => {
      const [resource, actionName] = permission.split(':');
      return hasPermission(resource, actionName);
    });
  }, [currentInterface, hasPermission]);

  const refreshInterface = useCallback(async (): Promise<void> => {
    if (!currentRoleId) return;
    
    try {
      store.setLoading(true);
      store.setError(null);
      
      const response = await fetch(`/api/v1/auth/role-interface/${currentRoleId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch interface configuration');
      }
      
      const interfaceConfig = await response.json();
      store.setInterface(currentRoleId, interfaceConfig);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to refresh interface');
    } finally {
      store.setLoading(false);
    }
  }, [currentRoleId, store.setLoading, store.setError, store.setInterface, store]);

  return {
    currentInterface,
    isLoading: store.isLoading,
    error: store.error,
    updatePreferences,
    resetInterface,
    getWidgetsByPriority,
    getVisibleNavigation,
    isFieldVisible,
    getFieldOrder,
    hasWidgetAccess,
    canPerformQuickAction,
    refreshInterface,
  };
};