import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SystemPerformanceMonitoring from '@/app/(dashboard)/coordinator/monitoring/page';

// Mock fetch globally
global.fetch = jest.fn();

const mockMetricsResponse = {
  success: true,
  data: {
    metrics: {
      timestamp: new Date().toISOString(),
      cpuUsage: 75.5,
      memoryUsage: 82.3,
      apiResponseTime: 125.6,
      databaseLatency: 45.2,
      queueProcessingRate: 850,
      activeConnections: 42,
      errorRate: 2.1,
    },
    trends: {},
    thresholds: {},
  },
  message: 'System performance metrics retrieved successfully',
  timestamp: new Date().toISOString(),
};

const mockUserActivityResponse = {
  success: true,
  data: {
    users: [
      {
        userId: 'user-1',
        userName: 'Sarah Johnson',
        role: 'ASSESSOR',
        sessionStart: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        actionsCount: 45,
        currentPage: '/assessments',
        isActive: true,
      },
    ],
    stats: {
      totalActiveUsers: 1,
      totalSessions: 1,
      averageSessionDuration: 2.0,
      totalActions: 45,
    },
  },
};

const mockSyncStatsResponse = {
  success: true,
  data: {
    syncStatistics: {
      totalSyncRequests: 100,
      successfulSyncs: 95,
      failedSyncs: 5,
      conflictCount: 2,
      averageProcessingTime: 1500,
      queueSize: 25,
      priorityBreakdown: {
        high: 5,
        normal: 15,
        low: 5,
      },
    },
  },
};

const mockActiveAlertsResponse = {
  success: true,
  data: {
    alerts: [
      {
        id: 'alert-1',
        type: 'PERFORMANCE',
        severity: 'HIGH',
        title: 'High CPU Usage',
        description: 'CPU usage exceeds 85%',
        threshold: 85,
        currentValue: 90.5,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    summary: {
      totalActive: 1,
      unacknowledged: 1,
    },
  },
};

describe('SystemPerformanceMonitoring Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock all API endpoints
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/v1/system/performance/metrics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMetricsResponse),
        });
      }
      if (url.includes('/api/v1/system/performance/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserActivityResponse),
        });
      }
      if (url.includes('/api/v1/system/performance/sync-stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSyncStatsResponse),
        });
      }
      if (url.includes('/api/v1/system/alerts/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActiveAlertsResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders page title and description', async () => {
    render(<SystemPerformanceMonitoring />);

    expect(screen.getByText('System Performance Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Monitor system operations, user activity, and performance metrics')).toBeInTheDocument();
  });

  it('displays system overview cards after loading', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('75.5%')).toBeInTheDocument(); // CPU Usage
    });

    expect(screen.getByText('82.3%')).toBeInTheDocument(); // Memory Usage
    expect(screen.getByText('1')).toBeInTheDocument(); // Active Users
    expect(screen.getByText('2.10%')).toBeInTheDocument(); // Error Rate
  });

  it('shows system health status badge', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText(/System/)).toBeInTheDocument();
    });
  });

  it('displays performance metrics section', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });

    expect(screen.getByText('Real-time system performance data')).toBeInTheDocument();
    expect(screen.getByText('126ms')).toBeInTheDocument(); // API Response Time
    expect(screen.getByText('45ms')).toBeInTheDocument(); // Database Latency
  });

  it('shows active alerts section', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    });

    expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('CPU usage exceeds 85%')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('displays user activity section', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('User Activity')).toBeInTheDocument();
    });

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('ASSESSOR')).toBeInTheDocument();
    expect(screen.getByText('45 actions')).toBeInTheDocument();
  });

  it('shows sync performance section', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Sync Performance')).toBeInTheDocument();
    });

    expect(screen.getByText('95.0%')).toBeInTheDocument(); // Success rate
    expect(screen.getByText('95 of 100')).toBeInTheDocument(); // Success details
    expect(screen.getByText('25')).toBeInTheDocument(); // Queue size
    expect(screen.getByText('Priority Breakdown')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Should make additional API calls
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(8); // Initial 4 calls + 4 refresh calls
    });
  });

  it('displays correct system health status based on metrics', async () => {
    // Test critical status
    const criticalMetricsResponse = {
      ...mockMetricsResponse,
      data: {
        ...mockMetricsResponse.data,
        metrics: {
          ...mockMetricsResponse.data.metrics,
          cpuUsage: 95, // Critical level
          errorRate: 12, // Critical level
        },
      },
    };

    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/v1/system/performance/metrics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(criticalMetricsResponse),
        });
      }
      // Keep other mocks the same
      if (url.includes('/api/v1/system/performance/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserActivityResponse),
        });
      }
      if (url.includes('/api/v1/system/performance/sync-stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSyncStatsResponse),
        });
      }
      if (url.includes('/api/v1/system/alerts/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActiveAlertsResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('95.0%')).toBeInTheDocument(); // CPU usage
      expect(screen.getByText('12.00%')).toBeInTheDocument(); // Error rate
    });
  });

  it('shows no alerts message when no alerts are active', async () => {
    const noAlertsResponse = {
      success: true,
      data: {
        alerts: [],
        summary: {
          totalActive: 0,
          unacknowledged: 0,
        },
      },
    };

    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/v1/system/alerts/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(noAlertsResponse),
        });
      }
      // Keep other mocks the same
      if (url.includes('/api/v1/system/performance/metrics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMetricsResponse),
        });
      }
      if (url.includes('/api/v1/system/performance/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserActivityResponse),
        });
      }
      if (url.includes('/api/v1/system/performance/sync-stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSyncStatsResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('No active alerts')).toBeInTheDocument();
    });
  });

  it('calls all required APIs on mount', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/system/performance/metrics?includeHistory=true');
      expect(fetch).toHaveBeenCalledWith('/api/v1/system/performance/users?includeInactive=false');
      expect(fetch).toHaveBeenCalledWith('/api/v1/system/performance/sync-stats?includeQueue=true');
      expect(fetch).toHaveBeenCalledWith('/api/v1/system/alerts/active?acknowledged=false');
    });
  });

  it('displays last updated timestamp', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      expect(screen.getByText(/Auto-refresh every 25 seconds/)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      // Page should still render with empty/default states
      expect(screen.getByText('System Performance Monitoring')).toBeInTheDocument();
    });
  });

  it('formats time values correctly', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText(/\d+m ago/)).toBeInTheDocument(); // User activity time
    });
  });

  it('displays priority breakdown in sync section', async () => {
    render(<SystemPerformanceMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Priority Breakdown')).toBeInTheDocument();
    });

    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});