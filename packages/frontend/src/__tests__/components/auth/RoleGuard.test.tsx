import { render, screen } from '@testing-library/react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useRoleContext } from '@/components/providers/RoleContextProvider';

jest.mock('@/components/providers/RoleContextProvider');

const mockUseRoleContext = useRoleContext as jest.MockedFunction<typeof useRoleContext>;

describe('RoleGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when user has required role', () => {
    mockUseRoleContext.mockReturnValue({
      hasAnyRole: jest.fn().mockReturnValue(true),
      hasPermission: jest.fn().mockReturnValue(true),
      activeRoleName: 'COORDINATOR',
      assignedRoles: [],
      activeRole: null,
      isMultiRole: false,
      switchRole: jest.fn(),
      hasRole: jest.fn(),
      isLoading: false,
      error: null,
      permissions: [],
      canAccess: jest.fn()
    });

    render(
      <RoleGuard requiredRoles={['COORDINATOR']}>
        <div>Protected content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('should show access denied when user lacks required role', () => {
    mockUseRoleContext.mockReturnValue({
      hasAnyRole: jest.fn().mockReturnValue(false),
      hasPermission: jest.fn().mockReturnValue(true),
      activeRoleName: 'ASSESSOR',
      assignedRoles: [],
      activeRole: null,
      isMultiRole: false,
      switchRole: jest.fn(),
      hasRole: jest.fn(),
      isLoading: false,
      error: null,
      permissions: [],
      canAccess: jest.fn()
    });

    render(
      <RoleGuard requiredRoles={['COORDINATOR']}>
        <div>Protected content</div>
      </RoleGuard>
    );

    expect(screen.getByText(/Access denied/)).toBeInTheDocument();
    expect(screen.getByText(/COORDINATOR/)).toBeInTheDocument();
    expect(screen.getByText(/Current role: ASSESSOR/)).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('should check permissions when required', () => {
    const mockHasPermission = jest.fn().mockReturnValue(false);
    
    mockUseRoleContext.mockReturnValue({
      hasAnyRole: jest.fn().mockReturnValue(true),
      hasPermission: mockHasPermission,
      activeRoleName: 'ASSESSOR',
      assignedRoles: [],
      activeRole: null,
      isMultiRole: false,
      switchRole: jest.fn(),
      hasRole: jest.fn(),
      isLoading: false,
      error: null,
      permissions: [],
      canAccess: jest.fn()
    });

    render(
      <RoleGuard 
        requiredRoles={['ASSESSOR']}
        requiredPermissions={[{ resource: 'assessments', action: 'delete' }]}
      >
        <div>Protected content</div>
      </RoleGuard>
    );

    expect(mockHasPermission).toHaveBeenCalledWith('assessments', 'delete');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('should render fallback when provided', () => {
    mockUseRoleContext.mockReturnValue({
      hasAnyRole: jest.fn().mockReturnValue(false),
      hasPermission: jest.fn().mockReturnValue(true),
      activeRoleName: 'ASSESSOR',
      assignedRoles: [],
      activeRole: null,
      isMultiRole: false,
      switchRole: jest.fn(),
      hasRole: jest.fn(),
      isLoading: false,
      error: null,
      permissions: [],
      canAccess: jest.fn()
    });

    render(
      <RoleGuard 
        requiredRoles={['COORDINATOR']}
        fallback={<div>Custom fallback</div>}
      >
        <div>Protected content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText(/Access denied/)).not.toBeInTheDocument();
  });

  it('should render nothing when showError is false', () => {
    mockUseRoleContext.mockReturnValue({
      hasAnyRole: jest.fn().mockReturnValue(false),
      hasPermission: jest.fn().mockReturnValue(true),
      activeRoleName: 'ASSESSOR',
      assignedRoles: [],
      activeRole: null,
      isMultiRole: false,
      switchRole: jest.fn(),
      hasRole: jest.fn(),
      isLoading: false,
      error: null,
      permissions: [],
      canAccess: jest.fn()
    });

    const { container } = render(
      <RoleGuard 
        requiredRoles={['COORDINATOR']}
        showError={false}
      >
        <div>Protected content</div>
      </RoleGuard>
    );

    expect(container.firstChild).toBeNull();
  });
});