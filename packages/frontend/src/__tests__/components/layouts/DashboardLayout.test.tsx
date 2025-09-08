import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardLayout, RoleQuickActions, MetricWidget } from '@/components/layouts/DashboardLayout';
import { useRoleInterface } from '@/hooks/useRoleInterface';

jest.mock('@/hooks/useRoleInterface');

const mockUseRoleInterface = useRoleInterface as jest.MockedFunction<typeof useRoleInterface>;

describe('DashboardLayout', () => {
  const mockRoleInterface = {
    currentInterface: {
      roleId: 'ASSESSOR_001',
      roleName: 'ASSESSOR' as const,
      dashboard: {
        layout: 'three-column' as const,
        widgets: [
          {
            id: 'active-assessments',
            type: 'metric' as const,
            title: 'Active Assessments',
            dataSource: '/api/assessments/active',
            refreshable: true,
            minimizable: false,
            requiredPermissions: ['assessments:read'],
            priority: 1,
          },
          {
            id: 'emergency-reports',
            type: 'metric' as const,
            title: 'Emergency Reports',
            dataSource: '/api/assessments/emergency',
            refreshable: true,
            minimizable: true,
            requiredPermissions: ['assessments:read'],
            priority: 2,
          },
        ],
        refreshInterval: 15000,
        pinnedWidgets: [],
        hiddenWidgets: [],
      },
      navigation: { primaryMenuItems: [], quickActions: [] },
      forms: { conditionalFields: {}, defaultValues: {}, validationRules: {}, fieldVisibility: {} },
      preferences: {},
    },
    isLoading: false,
    error: null,
    getWidgetsByPriority: jest.fn(),
    hasWidgetAccess: jest.fn(),
    refreshInterface: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoleInterface.mockReturnValue({
      ...mockRoleInterface,
      updatePreferences: jest.fn(),
      resetInterface: jest.fn(),
      getVisibleNavigation: jest.fn(),
      isFieldVisible: jest.fn(),
      getFieldOrder: jest.fn(),
      canPerformQuickAction: jest.fn(),
    } as any);

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Layout Rendering', () => {
    it('should render loading state when no interface available', () => {
      mockUseRoleInterface.mockReturnValue({
        ...mockRoleInterface,
        currentInterface: null,
      } as any);

      render(<DashboardLayout />);

      expect(screen.getByText('Loading Dashboard...')).toBeInTheDocument();
      expect(screen.getByText('Setting up your role-specific interface.')).toBeInTheDocument();
    });

    it('should render widgets when interface is available', () => {
      mockRoleInterface.getWidgetsByPriority.mockReturnValue(mockRoleInterface.currentInterface!.dashboard.widgets);
      mockRoleInterface.hasWidgetAccess.mockReturnValue(true);

      render(<DashboardLayout />);

      expect(screen.getByText('Active Assessments')).toBeInTheDocument();
      expect(screen.getByText('Emergency Reports')).toBeInTheDocument();
    });

    it('should apply correct layout classes based on configuration', () => {
      mockRoleInterface.getWidgetsByPriority.mockReturnValue(mockRoleInterface.currentInterface!.dashboard.widgets);
      mockRoleInterface.hasWidgetAccess.mockReturnValue(true);

      const { container } = render(<DashboardLayout />);

      const gridContainer = container.querySelector('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should handle different layout types correctly', () => {
      mockUseRoleInterface.mockReturnValue({
        ...mockRoleInterface,
        currentInterface: {
          ...mockRoleInterface.currentInterface!,
          dashboard: {
            ...mockRoleInterface.currentInterface!.dashboard,
            layout: 'grid',
          },
        },
      });

      mockRoleInterface.getWidgetsByPriority.mockReturnValue(mockRoleInterface.currentInterface!.dashboard.widgets);
      mockRoleInterface.hasWidgetAccess.mockReturnValue(true);

      const { container } = render(<DashboardLayout />);

      const gridContainer = container.querySelector('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Widget Functionality', () => {
    it('should handle widget refresh functionality', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 42, subtitle: 'Updated data' }),
      } as Response);

      mockRoleInterface.getWidgetsByPriority.mockReturnValue(mockRoleInterface.currentInterface!.dashboard.widgets);
      mockRoleInterface.hasWidgetAccess.mockReturnValue(true);

      render(<DashboardLayout />);

      const refreshButton = screen.getAllByTitle('Refresh')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/assessments/active');
      });
    });

    it('should handle widget minimize functionality', () => {
      mockRoleInterface.getWidgetsByPriority.mockReturnValue([mockRoleInterface.currentInterface!.dashboard.widgets[1]]);
      mockRoleInterface.hasWidgetAccess.mockReturnValue(true);

      render(<DashboardLayout />);

      const minimizeButton = screen.getByTitle('Minimize');
      fireEvent.click(minimizeButton);

      expect(screen.queryByText('No data available')).not.toBeInTheDocument();
    });
  });

  describe('Error and Loading States', () => {
    it('should display error state correctly', () => {
      mockUseRoleInterface.mockReturnValue({
        ...mockRoleInterface,
        error: 'Failed to load dashboard',
      });

      render(<DashboardLayout />);

      expect(screen.getByText(/Error: Failed to load dashboard/)).toBeInTheDocument();
    });

    it('should display loading state correctly', () => {
      mockUseRoleInterface.mockReturnValue({
        ...mockRoleInterface,
        isLoading: true,
      });

      render(<DashboardLayout />);

      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should provide retry functionality for errors', () => {
      const mockRefreshInterface = jest.fn();
      mockUseRoleInterface.mockReturnValue({
        ...mockRoleInterface,
        error: 'Network error',
        refreshInterface: mockRefreshInterface,
      });

      render(<DashboardLayout />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(mockRefreshInterface).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Content', () => {
    it('should render custom children alongside default dashboard', () => {
      mockRoleInterface.getWidgetsByPriority.mockReturnValue([]);

      render(
        <DashboardLayout>
          <div>Custom dashboard content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Custom dashboard content')).toBeInTheDocument();
    });

    it('should render custom widgets', () => {
      const customWidgets = [
        <div key="custom1">Custom Widget 1</div>,
        <div key="custom2">Custom Widget 2</div>,
      ];

      mockRoleInterface.getWidgetsByPriority.mockReturnValue([]);

      render(<DashboardLayout customWidgets={customWidgets} />);

      expect(screen.getByText('Custom Widget 1')).toBeInTheDocument();
      expect(screen.getByText('Custom Widget 2')).toBeInTheDocument();
    });

    it('should allow disabling default dashboard', () => {
      mockRoleInterface.getWidgetsByPriority.mockReturnValue(mockRoleInterface.currentInterface!.dashboard.widgets);

      render(<DashboardLayout showDefaultDashboard={false} />);

      expect(screen.queryByText('Active Assessments')).not.toBeInTheDocument();
    });
  });
});

describe('RoleQuickActions', () => {
  const mockQuickActions = [
    { id: 'new-assessment', label: 'New Assessment', icon: 'Plus', action: '/assessments/new', requiredPermissions: ['assessments:create'] },
    { id: 'emergency-report', label: 'Emergency Report', icon: 'AlertTriangle', action: '/assessments/emergency', requiredPermissions: ['assessments:create'] },
  ];

  beforeEach(() => {
    mockUseRoleInterface.mockReturnValue({
      ...mockRoleInterface,
      getVisibleNavigation: jest.fn().mockReturnValue({
        primaryMenuItems: [],
        quickActions: mockQuickActions,
      }),
      canPerformQuickAction: jest.fn().mockReturnValue(true),
    });

    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  it('should render quick actions when available', () => {
    render(<RoleQuickActions />);

    expect(screen.getByText('New Assessment')).toBeInTheDocument();
    expect(screen.getByText('Emergency Report')).toBeInTheDocument();
  });

  it('should not render when no quick actions available', () => {
    mockUseRoleInterface.mockReturnValue({
      ...mockRoleInterface,
      getVisibleNavigation: jest.fn().mockReturnValue({
        primaryMenuItems: [],
        quickActions: [],
      }),
    });

    const { container } = render(<RoleQuickActions />);
    expect(container.firstChild).toBeNull();
  });

  it('should handle quick action clicks', () => {
    render(<RoleQuickActions />);

    const actionButton = screen.getByText('New Assessment');
    fireEvent.click(actionButton);

    expect(window.location.href).toBe('/assessments/new');
  });
});

describe('MetricWidget', () => {
  it('should render metric with correct styling variants', () => {
    render(
      <MetricWidget 
        title="Test Metric" 
        value={42} 
        subtitle="Test subtitle"
        variant="success"
      />
    );

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    expect(screen.getByText('42')).toHaveClass('text-green-600');
  });

  it('should handle refresh functionality', () => {
    const mockRefresh = jest.fn();

    render(
      <MetricWidget 
        title="Refreshable Metric" 
        value="100" 
        refreshable={true}
        onRefresh={mockRefresh}
      />
    );

    const refreshButton = screen.getByTitle('Refresh');
    fireEvent.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should apply correct variant styles', () => {
    const { rerender } = render(
      <MetricWidget title="Test" value={10} variant="danger" />
    );

    expect(screen.getByText('10')).toHaveClass('text-red-600');

    rerender(<MetricWidget title="Test" value={10} variant="warning" />);
    expect(screen.getByText('10')).toHaveClass('text-orange-600');

    rerender(<MetricWidget title="Test" value={10} variant="success" />);
    expect(screen.getByText('10')).toHaveClass('text-green-600');
  });
});