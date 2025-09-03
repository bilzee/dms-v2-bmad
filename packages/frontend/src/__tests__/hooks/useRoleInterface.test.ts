import { renderHook, act } from '@testing-library/react';
import { useRoleInterface } from '@/hooks/useRoleInterface';
import { useRoleContext } from '@/components/providers/RoleContextProvider';

jest.mock('@/components/providers/RoleContextProvider');

const mockUseRoleContext = useRoleContext as jest.MockedFunction<typeof useRoleContext>;

describe('useRoleInterface', () => {
  const mockActiveRole = {
    id: 'ASSESSOR_001',
    name: 'ASSESSOR' as const,
    permissions: [],
    isActive: true,
  };

  const mockRoleContext = {
    activeRole: mockActiveRole,
    hasPermission: jest.fn(),
    assignedRoles: [mockActiveRole],
    availableRoles: [mockActiveRole],
    isMultiRole: false,
    canSwitchRoles: false,
    switchRole: jest.fn(),
    hasRole: jest.fn(),
    isLoading: false,
    error: null,
    permissions: [],
    hasAnyRole: jest.fn(),
    canAccess: jest.fn(),
    activeRoleName: 'ASSESSOR',
    sessionData: {
      preferences: {},
      workflowState: {},
      lastActivity: '',
      offlineData: false,
    },
    rollbackLastSwitch: jest.fn(),
    savePreferences: jest.fn(),
    saveWorkflowState: jest.fn(),
    getRoleContext: jest.fn(),
    performanceMs: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoleContext.mockReturnValue(mockRoleContext);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Interface Configuration', () => {
    it('should provide default interface configuration for ASSESSOR role', () => {
      const { result } = renderHook(() => useRoleInterface());

      expect(result.current.currentInterface).toBeDefined();
      expect(result.current.currentInterface?.roleName).toBe('ASSESSOR');
      expect(result.current.currentInterface?.navigation.primaryMenuItems).toContain('Assessment Types');
      expect(result.current.currentInterface?.dashboard.layout).toBe('three-column');
    });

    it('should provide different configuration for COORDINATOR role', () => {
      mockUseRoleContext.mockReturnValue({
        ...mockRoleContext,
        activeRole: { ...mockActiveRole, id: 'COORDINATOR_001', name: 'COORDINATOR' },
      });

      const { result } = renderHook(() => useRoleInterface());

      expect(result.current.currentInterface?.roleName).toBe('COORDINATOR');
      expect(result.current.currentInterface?.navigation.primaryMenuItems).toContain('Verification Dashboard');
      expect(result.current.currentInterface?.dashboard.layout).toBe('grid');
    });

    it('should handle null active role gracefully', () => {
      mockUseRoleContext.mockReturnValue({
        ...mockRoleContext,
        activeRole: null,
      });

      const { result } = renderHook(() => useRoleInterface());

      expect(result.current.currentInterface).toBeNull();
      expect(result.current.getWidgetsByPriority()).toEqual([]);
    });
  });

  describe('Widget Management', () => {
    beforeEach(() => {
      mockRoleContext.hasPermission.mockImplementation((resource: string, action: string) => {
        return resource === 'assessments' && action === 'read';
      });
    });

    it('should filter widgets by permissions', () => {
      const { result } = renderHook(() => useRoleInterface());

      const widgets = result.current.getWidgetsByPriority();
      const allowedWidgets = widgets.filter(w => w.requiredPermissions.includes('assessments:read'));
      
      expect(allowedWidgets.length).toBeGreaterThan(0);
      expect(widgets.every(w => 
        w.requiredPermissions.every(p => {
          const [resource, action] = p.split(':');
          return mockRoleContext.hasPermission(resource, action);
        })
      )).toBe(true);
    });

    it('should sort widgets by priority', () => {
      const { result } = renderHook(() => useRoleInterface());

      const widgets = result.current.getWidgetsByPriority();
      
      for (let i = 1; i < widgets.length; i++) {
        const prevPriority = widgets[i - 1].priority || 999;
        const currentPriority = widgets[i].priority || 999;
        expect(prevPriority).toBeLessThanOrEqual(currentPriority);
      }
    });

    it('should check widget access correctly', () => {
      const { result } = renderHook(() => useRoleInterface());

      expect(result.current.hasWidgetAccess('active-assessments')).toBe(true);
      expect(result.current.hasWidgetAccess('non-existent-widget')).toBe(false);
    });
  });

  describe('Navigation Management', () => {
    beforeEach(() => {
      mockRoleContext.hasPermission.mockImplementation((resource: string, action: string) => {
        return resource === 'assessments' && action === 'create';
      });
    });

    it('should filter quick actions by permissions', () => {
      const { result } = renderHook(() => useRoleInterface());

      const navigation = result.current.getVisibleNavigation();
      
      expect(navigation.quickActions).toBeDefined();
      navigation.quickActions?.forEach(action => {
        expect(action.requiredPermissions.every(p => {
          const [resource, actionName] = p.split(':');
          return mockRoleContext.hasPermission(resource, actionName);
        })).toBe(true);
      });
    });

    it('should validate quick action access', () => {
      const { result } = renderHook(() => useRoleInterface());

      expect(result.current.canPerformQuickAction('new-health-assessment')).toBe(true);
      expect(result.current.canPerformQuickAction('non-existent-action')).toBe(false);
    });
  });

  describe('Form Field Management', () => {
    it('should handle field visibility correctly', () => {
      // Mock hasPermission to return false for internal notes
      mockUseRoleContext.mockReturnValue({
        ...mockRoleContext,
        hasPermission: jest.fn((resource, action) => {
          if (resource === 'assessments' && action === 'write-internal') {
            return false;
          }
          return true;
        }),
      });

      const { result } = renderHook(() => useRoleInterface());

      expect(result.current.isFieldVisible('assessment', 'location')).toBe(true);
      expect(result.current.isFieldVisible('assessment', 'internal-notes')).toBe(false);
    });

    it('should provide field order for forms', () => {
      const { result } = renderHook(() => useRoleInterface());

      const fieldOrder = result.current.getFieldOrder('assessment');
      expect(fieldOrder).toContain('type');
      expect(fieldOrder).toContain('location');
      expect(fieldOrder).toContain('severity');
    });
  });

  describe('Preferences Management', () => {
    it('should update preferences successfully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useRoleInterface());

      await act(async () => {
        const success = await result.current.updatePreferences({ theme: 'dark' });
        expect(success).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/role-interface/preferences',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId: 'ASSESSOR_001', preferences: { theme: 'dark' } }),
        })
      );
    });

    it('should handle preferences update failure', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useRoleInterface());

      await act(async () => {
        const success = await result.current.updatePreferences({ theme: 'dark' });
        expect(success).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should reset interface to defaults', () => {
      const { result } = renderHook(() => useRoleInterface());

      act(() => {
        result.current.resetInterface();
      });

      expect(result.current.currentInterface?.preferences).toEqual({});
    });
  });

  describe('Interface Refresh', () => {
    it('should refresh interface configuration from API', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockInterface = {
        roleId: 'ASSESSOR_001',
        roleName: 'ASSESSOR',
        preferences: { theme: 'dark' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInterface,
      } as Response);

      const { result } = renderHook(() => useRoleInterface());

      await act(async () => {
        await result.current.refreshInterface();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/role-interface/ASSESSOR_001');
      expect(result.current.error).toBeNull();
    });

    it('should handle refresh errors gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useRoleInterface());

      await act(async () => {
        await result.current.refreshInterface();
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Performance Optimization', () => {
    it('should use memoization to prevent unnecessary recalculations', () => {
      const { result, rerender } = renderHook(() => useRoleInterface());

      const firstWidgets = result.current.getWidgetsByPriority();
      rerender();
      const secondWidgets = result.current.getWidgetsByPriority();

      expect(firstWidgets).toEqual(secondWidgets);
    });

    it('should handle role switches efficiently', () => {
      const { result, rerender } = renderHook(() => useRoleInterface());

      const assessorInterface = result.current.currentInterface;

      mockUseRoleContext.mockReturnValue({
        ...mockRoleContext,
        activeRole: { ...mockActiveRole, id: 'COORDINATOR_001', name: 'COORDINATOR' },
      });

      rerender();

      const coordinatorInterface = result.current.currentInterface;
      expect(coordinatorInterface?.roleName).toBe('COORDINATOR');
      expect(coordinatorInterface).not.toEqual(assessorInterface);
    });
  });
});