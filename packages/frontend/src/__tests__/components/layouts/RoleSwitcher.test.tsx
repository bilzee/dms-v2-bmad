import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoleIndicator } from '@/components/layouts/RoleIndicator';
import { useMultiRole } from '@/hooks/useMultiRole';

jest.mock('@/hooks/useMultiRole');
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ')
}));

const mockUseMultiRole = useMultiRole as jest.MockedFunction<typeof useMultiRole>;

describe('RoleIndicator Component - Context Switching', () => {
  const mockSwitchRole = jest.fn();
  const mockRollbackLastSwitch = jest.fn();
  const mockSavePreferences = jest.fn();

  const singleRoleData = {
    assignedRoles: [{ id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true }],
    activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
    availableRoles: [{ id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true }],
    isMultiRole: false,
    canSwitchRoles: false,
    switchRole: mockSwitchRole,
    hasRole: jest.fn(),
    isLoading: false,
    error: null,
    permissions: [],
    sessionData: { preferences: {}, workflowState: {}, offlineData: true },
    rollbackLastSwitch: mockRollbackLastSwitch,
    savePreferences: mockSavePreferences,
    getRoleContext: jest.fn(),
    performanceMs: null,
    lastRoleSwitch: undefined
  };

  const multiRoleData = {
    ...singleRoleData,
    assignedRoles: [
      { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
      { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: false }
    ],
    availableRoles: [
      { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
      { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: false }
    ],
    isMultiRole: true,
    canSwitchRoles: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visual Indicators and Performance', () => {
    it('should display active role with proper visual styling for single role', () => {
      mockUseMultiRole.mockReturnValue(singleRoleData);

      render(<RoleIndicator />);

      const indicator = screen.getByTestId('role-indicator');
      expect(indicator).toHaveTextContent('ASSESSOR');
      expect(indicator).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
    });

    it('should show dropdown for multi-role users with enhanced visuals', () => {
      mockUseMultiRole.mockReturnValue(multiRoleData);

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      expect(button).toHaveTextContent('ASSESSOR');
      
      fireEvent.click(button);
      
      const dropdown = screen.getByTestId('role-dropdown');
      expect(dropdown).toBeInTheDocument();
      expect(screen.getByText('COORDINATOR')).toBeInTheDocument();
    });

    it('should show loading state with animations during role switch', () => {
      mockUseMultiRole.mockReturnValue({
        ...multiRoleData,
        isLoading: true
      });

      render(<RoleIndicator />);

      const indicator = screen.getByTestId('role-indicator');
      expect(indicator).toHaveClass('bg-blue-500', 'text-white');
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should display performance metrics after successful switch', async () => {
      mockUseMultiRole.mockReturnValue({
        ...multiRoleData,
        performanceMs: 150,
        lastRoleSwitch: '2025-09-01T12:00:00Z'
      });

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/150ms/)).toBeInTheDocument();
        expect(screen.getByText(/12:00:00/)).toBeInTheDocument();
      });
    });
  });

  describe('Role Switching Functionality', () => {
    it('should call switchRole with correct parameters when role is selected', async () => {
      mockSwitchRole.mockResolvedValue(true);
      mockUseMultiRole.mockReturnValue({
        ...multiRoleData,
        switchRole: mockSwitchRole
      });

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      fireEvent.click(button);

      const coordinatorOption = screen.getByText('COORDINATOR');
      fireEvent.click(coordinatorOption);

      await waitFor(() => {
        expect(mockSwitchRole).toHaveBeenCalledWith('role-2', 'COORDINATOR');
      });
    });

    it('should prevent switching to currently active role', () => {
      mockUseMultiRole.mockReturnValue(multiRoleData);

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      fireEvent.click(button);

      const assessorOption = screen.getByText('ASSESSOR').closest('[role="menuitem"]');
      expect(assessorOption).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show error state and rollback option on switch failure', async () => {
      mockUseMultiRole.mockReturnValue({
        ...multiRoleData,
        error: 'Failed to switch role',
        rollbackLastSwitch: mockRollbackLastSwitch
      });

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      fireEvent.click(button);

      expect(screen.getByText('Failed to switch role')).toBeInTheDocument();
      expect(screen.getByText('Rollback Last Switch')).toBeInTheDocument();

      const rollbackButton = screen.getByText('Rollback Last Switch');
      fireEvent.click(rollbackButton);

      expect(mockRollbackLastSwitch).toHaveBeenCalled();
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session data across role switches', async () => {
      const mockContextData = {
        preferences: { theme: 'dark' },
        workflowState: { currentStep: 3 }
      };

      mockSwitchRole.mockImplementation(async (roleId, roleName, context) => {
        expect(context).toEqual(mockContextData);
        return true;
      });

      mockUseMultiRole.mockReturnValue({
        ...multiRoleData,
        switchRole: mockSwitchRole,
        sessionData: {
          preferences: mockContextData.preferences,
          workflowState: mockContextData.workflowState,
          offlineData: true,
          lastActivity: '2025-09-01T12:00:00Z'
        }
      });

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      fireEvent.click(button);

      const coordinatorOption = screen.getByText('COORDINATOR');
      fireEvent.click(coordinatorOption);

      await waitFor(() => {
        expect(mockSwitchRole).toHaveBeenCalledWith(
          'role-2', 
          'COORDINATOR',
          expect.objectContaining(mockContextData)
        );
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      mockSwitchRole.mockRejectedValue(new Error('Network error'));
      mockUseMultiRole.mockReturnValue({
        ...multiRoleData,
        switchRole: mockSwitchRole,
        error: 'Network error while switching role'
      });

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      fireEvent.click(button);

      expect(screen.getByText('Network error while switching role')).toBeInTheDocument();
    });

    it('should clear error state on successful role switch', async () => {
      mockUseMultiRole.mockReturnValue({
        ...multiRoleData,
        error: null,
        performanceMs: 120
      });

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      fireEvent.click(button);

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      expect(screen.getByText(/120ms/)).toBeInTheDocument();
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper ARIA attributes and keyboard navigation', () => {
      mockUseMultiRole.mockReturnValue(multiRoleData);

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      const dropdown = screen.getByTestId('role-dropdown');
      expect(dropdown).toHaveAttribute('role', 'menu');
    });

    it('should show appropriate feedback for disabled states', () => {
      mockUseMultiRole.mockReturnValue({
        ...multiRoleData,
        isLoading: true
      });

      render(<RoleIndicator />);

      const button = screen.getByTestId('role-indicator');
      expect(button).toBeDisabled();
      expect(button.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });
});