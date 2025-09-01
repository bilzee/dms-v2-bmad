import { renderHook, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useMultiRole } from '@/hooks/useMultiRole';

jest.mock('next-auth/react');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

const mockUpdate = jest.fn();

const mockSessionData = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    assignedRoles: [
      { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
      { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true }
    ],
    activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true }
  }
};

// Mock fetch globally
global.fetch = jest.fn();

describe('useMultiRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSessionData,
      status: 'authenticated',
      update: mockUpdate
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return assigned roles and active role', () => {
    const { result } = renderHook(() => useMultiRole());

    expect(result.current.assignedRoles).toEqual(mockSessionData.user.assignedRoles);
    expect(result.current.activeRole).toEqual(mockSessionData.user.activeRole);
    expect(result.current.isMultiRole).toBe(true);
  });

  it('should identify single-role users correctly', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          ...mockSessionData.user,
          assignedRoles: [{ id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true }]
        }
      },
      status: 'authenticated',
      update: mockUpdate
    } as any);

    const { result } = renderHook(() => useMultiRole());

    expect(result.current.isMultiRole).toBe(false);
  });

  it('should check if user has specific role', () => {
    const { result } = renderHook(() => useMultiRole());

    expect(result.current.hasRole('ASSESSOR')).toBe(true);
    expect(result.current.hasRole('COORDINATOR')).toBe(true);
    expect(result.current.hasRole('ADMIN')).toBe(false);
  });

  it('should switch roles successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { activeRoleId: 'role-2' } })
    });

    const { result } = renderHook(() => useMultiRole());

    await act(async () => {
      const success = await result.current.switchRole('role-2', 'COORDINATOR');
      expect(success).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/v1/auth/active-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: 'role-2', roleName: 'COORDINATOR' })
    });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should handle role switch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Role not found' })
    });

    const { result } = renderHook(() => useMultiRole());

    await act(async () => {
      const success = await result.current.switchRole('invalid-role', 'INVALID');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('Role not found');
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMultiRole());

    await act(async () => {
      const success = await result.current.switchRole('role-2', 'COORDINATOR');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('Network error while switching role');
  });
});