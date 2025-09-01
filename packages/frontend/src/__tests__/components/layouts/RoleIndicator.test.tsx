import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoleIndicator } from '@/components/layouts/RoleIndicator';
import { useMultiRole } from '@/hooks/useMultiRole';

jest.mock('@/hooks/useMultiRole');

const mockUseMultiRole = useMultiRole as jest.MockedFunction<typeof useMultiRole>;

const mockSwitchRole = jest.fn();

describe('RoleIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSwitchRole.mockResolvedValue(true);
  });

  it('should render single role without dropdown', () => {
    mockUseMultiRole.mockReturnValue({
      assignedRoles: [{ id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true }],
      activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
      isMultiRole: false,
      switchRole: mockSwitchRole,
      hasRole: () => true,
      isLoading: false,
      error: null
    });

    render(<RoleIndicator />);

    expect(screen.getByText('ASSESSOR')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render multi-role dropdown', () => {
    mockUseMultiRole.mockReturnValue({
      assignedRoles: [
        { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
        { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true }
      ],
      activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
      isMultiRole: true,
      switchRole: mockSwitchRole,
      hasRole: () => true,
      isLoading: false,
      error: null
    });

    render(<RoleIndicator />);

    expect(screen.getByText('ASSESSOR')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should open dropdown and show available roles', async () => {
    mockUseMultiRole.mockReturnValue({
      assignedRoles: [
        { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
        { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true }
      ],
      activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
      isMultiRole: true,
      switchRole: mockSwitchRole,
      hasRole: () => true,
      isLoading: false,
      error: null
    });

    render(<RoleIndicator />);

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('COORDINATOR')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('should switch roles when clicked', async () => {
    mockUseMultiRole.mockReturnValue({
      assignedRoles: [
        { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
        { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true }
      ],
      activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
      isMultiRole: true,
      switchRole: mockSwitchRole,
      hasRole: () => true,
      isLoading: false,
      error: null
    });

    render(<RoleIndicator />);

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      const coordinatorOption = screen.getByText('COORDINATOR').closest('div');
      fireEvent.click(coordinatorOption!);
    });

    expect(mockSwitchRole).toHaveBeenCalledWith('role-2', 'COORDINATOR');
  });

  it('should not render when no active role', () => {
    mockUseMultiRole.mockReturnValue({
      assignedRoles: [],
      activeRole: null,
      isMultiRole: false,
      switchRole: mockSwitchRole,
      hasRole: () => false,
      isLoading: false,
      error: null
    });

    const { container } = render(<RoleIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should show loading state', () => {
    mockUseMultiRole.mockReturnValue({
      assignedRoles: [
        { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
        { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true }
      ],
      activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
      isMultiRole: true,
      switchRole: mockSwitchRole,
      hasRole: () => true,
      isLoading: true,
      error: null
    });

    render(<RoleIndicator />);

    const triggerButton = screen.getByRole('button');
    expect(triggerButton).toBeDisabled();
  });
});