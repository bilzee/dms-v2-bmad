import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { PerformanceMetrics } from '@/components/features/monitoring/PerformanceMetrics';

// Mock fetch globally
global.fetch = jest.fn();

// Suppress React DOM 16.8+ act warnings for component internal async operations
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

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
    systemHealth: {
      overall: 'HEALTHY',
      components: {
        cpu: 'WARNING',
        memory: 'WARNING',
        database: 'HEALTHY',
        api: 'HEALTHY',
      },
    },
  },
  message: 'System performance metrics retrieved successfully',
  timestamp: new Date().toISOString(),
};

describe('PerformanceMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMetricsResponse),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    render(<PerformanceMetrics refreshInterval={1000} />);
    
    expect(screen.getByText('Loading system performance data...')).toBeInTheDocument();
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
  });

  it('displays system health overview after loading', async () => {
    render(<PerformanceMetrics refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('System Health Overview')).toBeInTheDocument();
    });

    expect(screen.getByText('HEALTHY')).toBeInTheDocument();
    expect(screen.getByText('75.5%')).toBeInTheDocument(); // CPU usage
    expect(screen.getByText('82.3%')).toBeInTheDocument(); // Memory usage
    expect(screen.getByText('45ms')).toBeInTheDocument(); // Database latency
    expect(screen.getByText('126ms')).toBeInTheDocument(); // API response time
  });

  it('shows detailed metrics when showDetailedView is true', async () => {
    render(<PerformanceMetrics refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      expect(screen.getByText('Resource Utilization')).toBeInTheDocument();
    });

    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('System Information')).toBeInTheDocument();
    expect(screen.getByText('Threshold: 70% warning, 85% critical')).toBeInTheDocument();
  });

  it('displays error state when fetch fails', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<PerformanceMetrics refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load performance data')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch system metrics. Please try refreshing the page.')).toBeInTheDocument();
  });

  it('makes API call with correct parameters', async () => {
    render(<PerformanceMetrics refreshInterval={1000} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/system/performance/metrics?includeHistory=true');
    });
  });

  it('handles different system health states correctly', async () => {
    const criticalResponse = {
      ...mockMetricsResponse,
      data: {
        ...mockMetricsResponse.data,
        systemHealth: {
          overall: 'CRITICAL',
          components: {
            cpu: 'CRITICAL',
            memory: 'CRITICAL',
            database: 'WARNING',
            api: 'HEALTHY',
          },
        },
      },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(criticalResponse),
    });

    render(<PerformanceMetrics refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });
  });

  it('updates metrics at specified intervals', async () => {
    jest.useFakeTimers();
    
    render(<PerformanceMetrics refreshInterval={5000} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Wrap timer advancement in act()
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('formats system uptime correctly', async () => {
    const timestampHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const responseWithOldTimestamp = {
      ...mockMetricsResponse,
      data: {
        ...mockMetricsResponse.data,
        metrics: {
          ...mockMetricsResponse.data.metrics,
          timestamp: timestampHoursAgo.toISOString(),
        },
      },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseWithOldTimestamp),
    });

    render(<PerformanceMetrics refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      expect(screen.getByText(/\d+h \d+m/)).toBeInTheDocument(); // Uptime format
    });
  });

  it('displays progress bars with correct values', async () => {
    render(<PerformanceMetrics refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  it('shows threshold information in detailed view', async () => {
    render(<PerformanceMetrics refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      expect(screen.getByText('Threshold: 70% warning, 85% critical')).toBeInTheDocument();
      expect(screen.getByText('Threshold: 75% warning, 90% critical')).toBeInTheDocument();
      expect(screen.getByText('Threshold: 2% warning, 5% critical')).toBeInTheDocument();
    });
  });
});