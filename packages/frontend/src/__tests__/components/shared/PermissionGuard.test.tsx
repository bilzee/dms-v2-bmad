import { render, screen } from '@testing-library/react';
import { 
  PermissionGuard, 
  FieldGuard, 
  WidgetGuard, 
  QuickActionGuard,
  RoleInterfaceGuard,
  LoadingGuard,
  ErrorGuard 
} from '@/components/shared/PermissionGuard';
import { useRoleContext } from '@/components/providers/RoleContextProvider';
import { useRoleInterface } from '@/hooks/useRoleInterface';

jest.mock('@/components/providers/RoleContextProvider');
jest.mock('@/hooks/useRoleInterface');

const mockUseRoleContext = useRoleContext as jest.MockedFunction<typeof useRoleContext>;
const mockUseRoleInterface = useRoleInterface as jest.MockedFunction<typeof useRoleInterface>;

describe('PermissionGuard', () => {
  const mockRoleContext = {
    activeRole: { id: 'ASSESSOR_001', name: 'ASSESSOR' as const, permissions: [], isActive: true },
    hasPermission: jest.fn(),
    assignedRoles: [],
    availableRoles: [],
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
    sessionData: { preferences: {}, workflowState: {}, lastActivity: '', offlineData: false },
    rollbackLastSwitch: jest.fn(),
    savePreferences: jest.fn(),
    saveWorkflowState: jest.fn(),
    getRoleContext: jest.fn(),
    performanceMs: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoleContext.mockReturnValue(mockRoleContext);
  });

  describe('Permission-based rendering', () => {
    it('should render children when user has required permissions', () => {
      mockRoleContext.hasPermission.mockReturnValue(true);

      render(
        <PermissionGuard requiredPermissions={['assessments:read']}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should not render children when user lacks required permissions', () => {
      mockRoleContext.hasPermission.mockReturnValue(false);

      render(
        <PermissionGuard requiredPermissions={['assessments:read']}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should render fallback when user lacks permissions', () => {
      mockRoleContext.hasPermission.mockReturnValue(false);

      render(
        <PermissionGuard 
          requiredPermissions={['assessments:read']}
          fallback={<div>Access denied</div>}
        >
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Access denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should show fallback message when enabled', () => {
      mockRoleContext.hasPermission.mockReturnValue(false);

      render(
        <PermissionGuard 
          requiredPermissions={['assessments:read']}
          showFallbackMessage={true}
        >
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.getByText(/You don't have permission/)).toBeInTheDocument();
    });
  });

  describe('Role-based rendering', () => {
    it('should render children when user has allowed role', () => {
      render(
        <PermissionGuard allowedRoles={['ASSESSOR']}>
          <div>Role-specific content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Role-specific content')).toBeInTheDocument();
    });

    it('should not render children when user role is not allowed', () => {
      render(
        <PermissionGuard allowedRoles={['COORDINATOR']}>
          <div>Role-specific content</div>
        </PermissionGuard>
      );

      expect(screen.queryByText('Role-specific content')).not.toBeInTheDocument();
    });

    it('should show role restriction message when enabled', () => {
      render(
        <PermissionGuard 
          allowedRoles={['COORDINATOR']}
          showFallbackMessage={true}
        >
          <div>Role-specific content</div>
        </PermissionGuard>
      );

      expect(screen.getByText(/This feature is not available for your current role/)).toBeInTheDocument();
    });
  });

  describe('Combined permissions and roles', () => {
    it('should require both role and permission access', () => {
      mockRoleContext.hasPermission.mockReturnValue(true);

      render(
        <PermissionGuard 
          allowedRoles={['ASSESSOR']}
          requiredPermissions={['assessments:read']}
        >
          <div>Fully protected content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Fully protected content')).toBeInTheDocument();
    });

    it('should block access if role is correct but permission is missing', () => {
      mockRoleContext.hasPermission.mockReturnValue(false);

      render(
        <PermissionGuard 
          allowedRoles={['ASSESSOR']}
          requiredPermissions={['assessments:write']}
        >
          <div>Fully protected content</div>
        </PermissionGuard>
      );

      expect(screen.queryByText('Fully protected content')).not.toBeInTheDocument();
    });
  });
});

describe('FieldGuard', () => {
  const mockRoleInterface = {
    isFieldVisible: jest.fn(),
  };

  beforeEach(() => {
    mockUseRoleInterface.mockReturnValue({
      ...mockRoleInterface,
      currentInterface: null,
      isLoading: false,
      error: null,
      updatePreferences: jest.fn(),
      resetInterface: jest.fn(),
      getWidgetsByPriority: jest.fn(),
      getVisibleNavigation: jest.fn(),
      getFieldOrder: jest.fn(),
      hasWidgetAccess: jest.fn(),
      canPerformQuickAction: jest.fn(),
      refreshInterface: jest.fn(),
    });
  });

  it('should render field when visible', () => {
    mockRoleInterface.isFieldVisible.mockReturnValue(true);

    render(
      <FieldGuard formType="assessment" fieldName="location">
        <input placeholder="Location" />
      </FieldGuard>
    );

    expect(screen.getByPlaceholderText('Location')).toBeInTheDocument();
  });

  it('should not render field when hidden', () => {
    mockRoleInterface.isFieldVisible.mockReturnValue(false);

    render(
      <FieldGuard formType="assessment" fieldName="internal-notes">
        <input placeholder="Internal Notes" />
      </FieldGuard>
    );

    expect(screen.queryByPlaceholderText('Internal Notes')).not.toBeInTheDocument();
  });
});

describe('WidgetGuard', () => {
  const mockRoleInterface = {
    hasWidgetAccess: jest.fn(),
  };

  beforeEach(() => {
    mockUseRoleInterface.mockReturnValue({
      ...mockRoleInterface,
      currentInterface: null,
      isLoading: false,
      error: null,
      updatePreferences: jest.fn(),
      resetInterface: jest.fn(),
      getWidgetsByPriority: jest.fn(),
      getVisibleNavigation: jest.fn(),
      isFieldVisible: jest.fn(),
      getFieldOrder: jest.fn(),
      canPerformQuickAction: jest.fn(),
      refreshInterface: jest.fn(),
    });
  });

  it('should render widget when accessible', () => {
    mockRoleInterface.hasWidgetAccess.mockReturnValue(true);

    render(
      <WidgetGuard widgetId="active-assessments">
        <div>Assessment Widget</div>
      </WidgetGuard>
    );

    expect(screen.getByText('Assessment Widget')).toBeInTheDocument();
  });

  it('should not render widget when not accessible', () => {
    mockRoleInterface.hasWidgetAccess.mockReturnValue(false);

    render(
      <WidgetGuard widgetId="restricted-widget">
        <div>Restricted Widget</div>
      </WidgetGuard>
    );

    expect(screen.queryByText('Restricted Widget')).not.toBeInTheDocument();
  });
});

describe('LoadingGuard', () => {
  it('should render children when not loading', () => {
    render(
      <LoadingGuard isLoading={false}>
        <div>Content loaded</div>
      </LoadingGuard>
    );

    expect(screen.getByText('Content loaded')).toBeInTheDocument();
  });

  it('should render loading placeholder when loading', () => {
    render(
      <LoadingGuard isLoading={true}>
        <div>Content loaded</div>
      </LoadingGuard>
    );

    expect(screen.queryByText('Content loaded')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render custom loading fallback', () => {
    render(
      <LoadingGuard 
        isLoading={true}
        fallback={<div>Custom loading...</div>}
      >
        <div>Content loaded</div>
      </LoadingGuard>
    );

    expect(screen.getByText('Custom loading...')).toBeInTheDocument();
  });
});

describe('ErrorGuard', () => {
  it('should render children when no error', () => {
    render(
      <ErrorGuard error={null}>
        <div>No errors</div>
      </ErrorGuard>
    );

    expect(screen.getByText('No errors')).toBeInTheDocument();
  });

  it('should render error message when error exists', () => {
    render(
      <ErrorGuard error="Something went wrong">
        <div>Content</div>
      </ErrorGuard>
    );

    expect(screen.getByText(/Error: Something went wrong/)).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should render retry button when showRetry is true', () => {
    const mockRetry = jest.fn();

    render(
      <ErrorGuard 
        error="Network error" 
        showRetry={true}
        onRetry={mockRetry}
      >
        <div>Content</div>
      </ErrorGuard>
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    retryButton.click();
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});