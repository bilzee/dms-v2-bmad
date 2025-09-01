import { renderHook, act, waitFor } from '@testing-library/react';
import { useMultiRole } from '@/hooks/useMultiRole';
import { useSession } from 'next-auth/react';

jest.mock('next-auth/react');
jest.mock('@/lib/prisma');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

global.fetch = jest.fn();

describe('useMultiRole Hook - Role Switching', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      assignedRoles: [
        { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
        { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: false }
      ],
      activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn()
    });
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Role Switching Performance', () => {
    it('should complete role switch within 200ms performance requirement', async () => {
      const mockResponse = {
        success: true,
        newRole: { id: 'role-2', name: 'COORDINATOR', permissions: [] },
        sessionContext: { activeRole: { id: 'role-2', name: 'COORDINATOR' } },
        performanceMs: 150
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useMultiRole());

      const startTime = Date.now();
      await act(async () => {
        await result.current.switchRole('role-2', 'COORDINATOR');
      });
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(200);
      expect(result.current.performanceMs).toBe(150);
    });

    it('should handle role switch failures with rollback capability', async () => {
      const mockFailResponse = {
        success: false,
        error: 'Database connection failed',
        rollbackInfo: { previousRoleId: 'role-1', timestamp: '2025-09-01T00:00:00Z' }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockFailResponse)
      });

      const { result } = renderHook(() => useMultiRole());

      await act(async () => {
        const success = await result.current.switchRole('role-2', 'COORDINATOR');
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Database connection failed');

      const mockRollbackResponse = {
        success: true,
        newRole: { id: 'role-1', name: 'ASSESSOR', permissions: [] }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockRollbackResponse)
      });

      await act(async () => {
        const rollbackSuccess = await result.current.rollbackLastSwitch();
        expect(rollbackSuccess).toBe(true);
      });
    });
  });

  describe('Session Data Maintenance', () => {
    it('should preserve preferences across role switches', async () => {
      const currentContext = {
        preferences: { theme: 'dark', language: 'en' },
        workflowState: { currentStep: 2 }
      };

      const mockResponse = {
        success: true,
        newRole: { id: 'role-2', name: 'COORDINATOR', permissions: [] },
        sessionContext: {
          activeRole: { id: 'role-2', name: 'COORDINATOR' },
          sessionData: { preferences: currentContext.preferences }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useMultiRole());

      await act(async () => {
        await result.current.switchRole('role-2', 'COORDINATOR', currentContext);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRoleId: 'role-2',
          targetRoleName: 'COORDINATOR',
          currentContext
        })
      });
    });

    it('should save and load role-specific preferences', async () => {
      const preferences = { dashboardLayout: 'grid', notifications: true };

      const mockResponse = { success: true, preferences };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useMultiRole());

      await act(async () => {
        const success = await result.current.savePreferences(preferences);
        expect(success).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/auth/role-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: 'role-1',
          preferences
        })
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMultiRole());

      await act(async () => {
        const success = await result.current.switchRole('role-2', 'COORDINATOR');
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Network error while switching role');
    });

    it('should handle authorization errors', async () => {
      const mockResponse = {
        success: false,
        error: 'User does not have access to this role'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useMultiRole());

      await act(async () => {
        const success = await result.current.switchRole('role-3', 'ADMIN');
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('User does not have access to this role');
    });
  });

  describe('Role Context Management', () => {
    it('should fetch and maintain role context', async () => {
      const mockContext = {
        success: true,
        context: {
          activeRole: { id: 'role-1', name: 'ASSESSOR' },
          availableRoles: mockSession.user.assignedRoles,
          canSwitchRoles: true,
          sessionData: { preferences: {}, workflowState: {}, offlineData: true }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockContext)
      });

      const { result } = renderHook(() => useMultiRole());

      await act(async () => {
        const context = await result.current.getRoleContext();
        expect(context).toEqual(mockContext.context);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/auth/role-context');
    });
  });
});