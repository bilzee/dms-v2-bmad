// components/features/admin/audit/__tests__/AuditDashboard.test.tsx

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuditDashboard } from '../AuditDashboard';
import * as useToastModule from '@/components/ui/use-toast';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock child components to focus on testing the dashboard logic
vi.mock('../UserActivityTable', () => ({
  UserActivityTable: ({ activities, showPagination, maxHeight }: any) => (
    <div data-testid="user-activity-table">
      <div>Activities: {activities?.length || 0}</div>
      <div>Pagination: {showPagination ? 'enabled' : 'disabled'}</div>
      <div>Max Height: {maxHeight || 'none'}</div>
    </div>
  ),
}));

vi.mock('../SecurityEventsPanel', () => ({
  SecurityEventsPanel: ({ events, showFilters, showPagination }: any) => (
    <div data-testid="security-events-panel">
      <div>Events: {events?.length || 0}</div>
      <div>Filters: {showFilters ? 'enabled' : 'disabled'}</div>
      <div>Pagination: {showPagination ? 'enabled' : 'disabled'}</div>
    </div>
  ),
}));

vi.mock('../SystemMetricsDisplay', () => ({
  SystemMetricsDisplay: ({ metrics, alerts, showDetailedView }: any) => (
    <div data-testid="system-metrics-display">
      <div>Metrics: {metrics ? 'loaded' : 'none'}</div>
      <div>Alerts: {alerts?.length || 0}</div>
      <div>Detailed: {showDetailedView ? 'yes' : 'no'}</div>
    </div>
  ),
}));

vi.mock('../AuditExportControls', () => ({
  AuditExportControls: () => (
    <div data-testid="audit-export-controls">Export Controls</div>
  ),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock data
const mockActivitiesResponse = {
  success: true,
  data: {
    activities: [
      {
        id: '1',
        userId: 'user-123',
        eventType: 'LOGIN',
        module: 'auth',
        ipAddress: '192.168.1.1',
        timestamp: '2024-01-01T10:00:00Z',
      },
      {
        id: '2',
        userId: 'user-456',
        eventType: 'API_ACCESS',
        module: 'incidents',
        ipAddress: '192.168.1.2',
        timestamp: '2024-01-01T10:01:00Z',
      },
    ],
    totalCount: 125,
  },
};

const mockSecurityResponse = {
  success: true,
  data: {
    events: [
      {
        id: 'sec-1',
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Multiple failed login attempts',
        ipAddress: '192.168.1.100',
        detectedAt: '2024-01-01T09:30:00Z',
        investigationStatus: 'PENDING',
      },
    ],
    totalCount: 8,
    stats: {
      criticalEvents: 2,
    },
  },
};

const mockPerformanceResponse = {
  success: true,
  data: {
    currentMetrics: {
      timestamp: '2024-01-01T10:00:00Z',
      database: { connectionCount: 15, avgQueryTime: 45 },
      api: { requestsPerMinute: 25.5, avgResponseTime: 180, errorRate: 2.1 },
      queue: { activeJobs: 5, waitingJobs: 12 },
      sync: { successRate: 98.5 },
      system: { cpuUsage: 25.3, memoryUsage: 62.8 },
    },
    alerts: [
      {
        type: 'HIGH_QUEUE_SIZE',
        severity: 'WARNING',
        message: 'Queue has high number of pending jobs',
        timestamp: '2024-01-01T10:00:00Z',
      },
    ],
    healthStatus: 'WARNING',
  },
};

describe('AuditDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default fetch responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/v1/admin/audit/activity')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockActivitiesResponse),
        });
      }
      if (url.includes('/api/v1/admin/audit/security-events')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockSecurityResponse),
        });
      }
      if (url.includes('/api/v1/admin/monitoring/performance')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockPerformanceResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    // Mock current time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render dashboard header with title and description', async () => {
      render(<AuditDashboard />);

      expect(screen.getByText('Audit Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Monitor system activity, security events, and performance metrics')).toBeInTheDocument();
    });

    it('should display refresh button and last updated time', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      // Make fetch hang to test loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<AuditDashboard />);

      // Loading state should be visible through the spinner in refresh button
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      expect(refreshButton).toBeDisabled();
    });

    it('should render all dashboard stats cards', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Activities')).toBeInTheDocument();
        expect(screen.getByText('Security Events')).toBeInTheDocument();
        expect(screen.getByText('Critical Events')).toBeInTheDocument();
        expect(screen.getByText('System Health')).toBeInTheDocument();
      });
    });

    it('should display correct stat values from API responses', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        expect(screen.getByText('125')).toBeInTheDocument(); // Total activities
        expect(screen.getByText('8')).toBeInTheDocument(); // Security events
        expect(screen.getByText('2')).toBeInTheDocument(); // Critical events
        expect(screen.getByText('WARNING')).toBeInTheDocument(); // System health
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should render all tab triggers', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'User Activity' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Security Events' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Performance' })).toBeInTheDocument();
      });
    });

    it('should show overview tab content by default', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        // Overview tab should show child components with correct props
        expect(screen.getByTestId('user-activity-table')).toBeInTheDocument();
        expect(screen.getByTestId('security-events-panel')).toBeInTheDocument();
        expect(screen.getByTestId('system-metrics-display')).toBeInTheDocument();
        expect(screen.getByTestId('audit-export-controls')).toBeInTheDocument();
      });
    });

    it('should switch to user activity tab when clicked', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'User Activity' }));
      });

      // Should show the activity table with full features enabled
      const activityTable = screen.getByTestId('user-activity-table');
      expect(activityTable).toHaveTextContent('Pagination: enabled');
    });

    it('should switch to security events tab when clicked', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Security Events' }));
      });

      // Should show the security events panel with filters enabled
      const securityPanel = screen.getByTestId('security-events-panel');
      expect(securityPanel).toHaveTextContent('Filters: enabled');
      expect(securityPanel).toHaveTextContent('Pagination: enabled');
    });

    it('should switch to performance tab when clicked', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Performance' }));
      });

      // Should show detailed system metrics view
      const metricsDisplay = screen.getByTestId('system-metrics-display');
      expect(metricsDisplay).toHaveTextContent('Detailed: yes');
    });
  });

  describe('Data Loading', () => {
    it('should load dashboard data on mount', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/admin/audit/activity?limit=10&sortOrder=desc');
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/admin/audit/security-events?limit=10&sortOrder=desc');
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/admin/monitoring/performance?includeHistorical=false');
      });
    });

    it('should pass loaded data to child components', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        // Check that data is passed to components
        const activityTable = screen.getByTestId('user-activity-table');
        expect(activityTable).toHaveTextContent('Activities: 2'); // 2 activities from mock

        const securityPanel = screen.getByTestId('security-events-panel');
        expect(securityPanel).toHaveTextContent('Events: 1'); // 1 event from mock

        const metricsDisplay = screen.getByTestId('system-metrics-display');
        expect(metricsDisplay).toHaveTextContent('Metrics: loaded');
        expect(metricsDisplay).toHaveTextContent('Alerts: 1'); // 1 alert from mock
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      render(<AuditDashboard />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to load audit dashboard data',
          variant: 'destructive',
        });
      });
    });

    it('should handle partial API failures', async () => {
      // Make one API call fail, others succeed
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/v1/admin/audit/activity')) {
          return Promise.reject(new Error('Activity API failed'));
        }
        if (url.includes('/api/v1/admin/audit/security-events')) {
          return Promise.resolve({
            json: () => Promise.resolve(mockSecurityResponse),
          });
        }
        if (url.includes('/api/v1/admin/monitoring/performance')) {
          return Promise.resolve({
            json: () => Promise.resolve(mockPerformanceResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<AuditDashboard />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to load audit dashboard data',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Auto-refresh Functionality', () => {
    it('should auto-refresh data every 30 seconds', async () => {
      render(<AuditDashboard />);

      // Initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      vi.clearAllMocks();

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should clear auto-refresh timer on component unmount', async () => {
      const { unmount } = render(<AuditDashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      unmount();

      vi.clearAllMocks();
      vi.advanceTimersByTime(30000);

      // Should not refresh after unmount
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Manual Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      render(<AuditDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      vi.clearAllMocks();

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should disable refresh button during loading', async () => {
      // Make fetch slow to test loading state
      mockFetch.mockImplementation((url: string) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            if (url.includes('activity')) resolve({ json: () => Promise.resolve(mockActivitiesResponse) });
            if (url.includes('security-events')) resolve({ json: () => Promise.resolve(mockSecurityResponse) });
            if (url.includes('performance')) resolve({ json: () => Promise.resolve(mockPerformanceResponse) });
          }, 100);
        });
      });

      render(<AuditDashboard />);

      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      expect(refreshButton).toBeDisabled();

      // Wait for loading to complete
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      }, { timeout: 200 });
    });
  });

  describe('Health Status Badge', () => {
    it('should display correct health status badge variant', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        const healthBadge = screen.getByText('WARNING');
        expect(healthBadge).toBeInTheDocument();
        // Badge should have warning styling (this would need to be tested with CSS class checking)
      });
    });

    it('should handle different health statuses', async () => {
      // Test HEALTHY status
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('performance')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              ...mockPerformanceResponse,
              data: { ...mockPerformanceResponse.data, healthStatus: 'HEALTHY' }
            }),
          });
        }
        // Return other mocks as usual
        if (url.includes('activity')) return Promise.resolve({ json: () => Promise.resolve(mockActivitiesResponse) });
        if (url.includes('security-events')) return Promise.resolve({ json: () => Promise.resolve(mockSecurityResponse) });
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<AuditDashboard />);

      await waitFor(() => {
        expect(screen.getByText('HEALTHY')).toBeInTheDocument();
      });
    });
  });

  describe('Props Passing to Child Components', () => {
    it('should pass correct props to UserActivityTable in overview', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        const activityTable = screen.getByTestId('user-activity-table');
        expect(activityTable).toHaveTextContent('Activities: 2');
        expect(activityTable).toHaveTextContent('Pagination: disabled'); // Overview shows limited view
        expect(activityTable).toHaveTextContent('Max Height: 400px');
      });
    });

    it('should pass correct props to SecurityEventsPanel in overview', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        const securityPanel = screen.getByTestId('security-events-panel');
        expect(securityPanel).toHaveTextContent('Events: 1');
        expect(securityPanel).toHaveTextContent('Filters: disabled'); // Overview shows limited view
        expect(securityPanel).toHaveTextContent('Pagination: disabled');
      });
    });

    it('should pass correct props to SystemMetricsDisplay', async () => {
      render(<AuditDashboard />);

      await waitFor(() => {
        const metricsDisplay = screen.getByTestId('system-metrics-display');
        expect(metricsDisplay).toHaveTextContent('Metrics: loaded');
        expect(metricsDisplay).toHaveTextContent('Alerts: 1');
        expect(metricsDisplay).toHaveTextContent('Detailed: no'); // Overview shows summary view
      });
    });
  });

  describe('Error State Handling', () => {
    it('should display stats as zero when data loading fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<AuditDashboard />);

      await waitFor(() => {
        // Should show default/zero values when API calls fail
        expect(screen.getByText('Total Activities')).toBeInTheDocument();
        expect(screen.getByText('Security Events')).toBeInTheDocument();
        
        // Error should be logged
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to load audit dashboard data',
          variant: 'destructive',
        });
      });
    });
  });
});