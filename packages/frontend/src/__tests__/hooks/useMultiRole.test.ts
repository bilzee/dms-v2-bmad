import { renderHook, act, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { useSession } from 'next-auth/react';
import { useMultiRole } from '../useMultiRole';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock session data
const mockSessionData = {
  user: {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    assignedRoles: [
      { id: 'role-1', name: 'RESPONDER', permissions: [], isActive: true },
      { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true }
    ],
    activeRole: { id: 'role-1', name: 'RESPONDER', permissions: [], isActive: true }
  }
};

describe('useMultiRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('initializes with session data', () => {
    mockUseSession.mockReturnValue({
      data: mockSessionData,
      status: 'authenticated',
      update: jest.fn()
    });

    const { result } = renderHook(() => useMultiRole());

    expect(result.current.assignedRoles).toEqual(mockSessionData.user.assignedRoles);
    expect(result.current.activeRole).toEqual(mockSessionData.user.activeRole);
    expect(result.current.isMultiRole).toBe(true);
    expect(result.current.canSwitchRoles).toBe(true);
  });

  it('fetches role context on mount', async () => {
    mockUseSession.mockReturnValue({
      data: mockSessionData,
      status: 'authenticated',
      update: jest.fn()
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          activeRole: mockSessionData.user.activeRole,
          availableRoles: mockSessionData.user.assignedRoles,
          canSwitchRoles: true
        }
      })
    } as Response);

    renderHook(() => useMultiRole());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/session/role');
    });
  });

  it('switches roles successfully', async () => {
    const mockUpdate = jest.fn();
    mockUseSession.mockReturnValue({
      data: mockSessionData,
      status: 'authenticated',
      update: mockUpdate
    });

    // Mock successful role switch
    mockFetch.mockImplementation((url, options) => {
      if (url === '/api/v1/session/role' && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              activeRole: { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true },
              availableRoles: mockSessionData.user.assignedRoles
            }
          })
        } as Response);
      }
      // Initial context fetch
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            activeRole: mockSessionData.user.activeRole,
            availableRoles: mockSessionData.user.assignedRoles,
            canSwitchRoles: true
          }
        })
      } as Response);
    });

    const { result } = renderHook(() => useMultiRole());

    await act(async () => {
      const success = await result.current.switchRole('role-2', 'COORDINATOR');
      expect(success).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/session/role', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roleId: 'role-2' })
    });

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('handles role switch failure', async () => {
    mockUseSession.mockReturnValue({
      data: mockSessionData,
      status: 'authenticated',
      update: jest.fn()
    });

    // Mock failed role switch
    mockFetch.mockImplementation((url, options) => {
      if (url === '/api/v1/session/role' && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: false,
            error: 'Role switch failed'
          })
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: {} })
      } as Response);
    });

    const { result } = renderHook(() => useMultiRole());

    await act(async () => {
      const success = await result.current.switchRole('invalid-role', 'INVALID');
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('Role switch failed');
  });

  it('rollbacks to previous role', async () => {
    mockUseSession.mockReturnValue({
      data: mockSessionData,
      status: 'authenticated',
      update: jest.fn()
    });

    let callCount = 0;
    mockFetch.mockImplementation((url, options) => {
      if (url === '/api/v1/session/role' && options?.method === 'PUT') {
        callCount++;
        if (callCount === 1) {
          // First switch to COORDINATOR
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                activeRole: { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true },
                availableRoles: mockSessionData.user.assignedRoles
              }
            })
          } as Response);
        } else {
          // Rollback to RESPONDER
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                activeRole: { id: 'role-1', name: 'RESPONDER', permissions: [], isActive: true },
                availableRoles: mockSessionData.user.assignedRoles
              }
            })
          } as Response);
        }
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: {} })
      } as Response);
    });

    const { result } = renderHook(() => useMultiRole());

    // First switch role
    await act(async () => {
      await result.current.switchRole('role-2', 'COORDINATOR');
    });

    // Then rollback
    await act(async () => {
      const success = await result.current.rollbackLastSwitch();
      expect(success).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial fetch + 2 role switches
  });

  it('saves role preferences', async () => {
    mockUseSession.mockReturnValue({
      data: mockSessionData,
      status: 'authenticated',
      update: jest.fn()
    });

    mockFetch.mockImplementation((url, options) => {
      if (url === '/api/v1/auth/role-preferences' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            preferences: { theme: 'dark', language: 'en' }
          })
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: {} })
      } as Response);
    });

    const { result } = renderHook(() => useMultiRole());

    await act(async () => {
      const success = await result.current.savePreferences({
        theme: 'dark',
        language: 'en'
      });
      expect(success).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/role-preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roleId: 'role-1',
        preferences: { theme: 'dark', language: 'en' }
      })
    });
  });

  it('checks if user has specific role', () => {
    mockUseSession.mockReturnValue({
      data: mockSessionData,
      status: 'authenticated',
      update: jest.fn()
    });

    const { result } = renderHook(() => useMultiRole());

    expect(result.current.hasRole('RESPONDER')).toBe(true);
    expect(result.current.hasRole('COORDINATOR')).toBe(true);
    expect(result.current.hasRole('ADMIN')).toBe(false);
  });

  it('handles single role user', () => {
    const singleRoleSession = {
      ...mockSessionData,
      user: {
        ...mockSessionData.user,
        assignedRoles: [mockSessionData.user.assignedRoles[0]]
      }
    };

    mockUseSession.mockReturnValue({
      data: singleRoleSession,
      status: 'authenticated',
      update: jest.fn()
    });

    const { result } = renderHook(() => useMultiRole());

    expect(result.current.isMultiRole).toBe(false);
    expect(result.current.canSwitchRoles).toBe(false);
  });

  it('handles unauthenticated user', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn()
    });

    const { result } = renderHook(() => useMultiRole());

    expect(result.current.assignedRoles).toEqual([]);
    expect(result.current.activeRole).toBeNull();
    expect(result.current.isMultiRole).toBe(false);
    expect(result.current.canSwitchRoles).toBe(false);
  });

  it('measures performance of role switches', async () => {
    mockUseSession.mockReturnValue({
      data: mockSessionData,
      status: 'authenticated',
      update: jest.fn()
    });

    mockFetch.mockImplementation((url, options) => {
      if (url === '/api/v1/session/role' && options?.method === 'PUT') {
        // Simulate 100ms response time
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: {
                  activeRole: { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true },
                  availableRoles: mockSessionData.user.assignedRoles
                }
              })
            } as Response);
          }, 100);
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: {} })
      } as Response);
    });

    const { result } = renderHook(() => useMultiRole());

    await act(async () => {
      await result.current.switchRole('role-2', 'COORDINATOR');
    });

    expect(result.current.performanceMs).toBeGreaterThan(90);
    expect(result.current.performanceMs).toBeLessThan(200);
  });
});