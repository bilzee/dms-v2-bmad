import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataFreshnessIndicator } from '@/components/features/monitoring/DataFreshnessIndicator';

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

const mockDataFreshnessResponse = {
  success: true,
  data: [
    {
      category: 'assessments',
      totalCount: 100,
      realTimeCount: 85,
      recentCount: 10,
      offlinePendingCount: 5,
      oldestPending: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      syncQueueSize: 3,
    },
    {
      category: 'responses',
      totalCount: 80,
      realTimeCount: 60,
      recentCount: 15,
      offlinePendingCount: 5,
      oldestPending: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      syncQueueSize: 2,
    },
    {
      category: 'incidents',
      totalCount: 10,
      realTimeCount: 8,
      recentCount: 2,
      offlinePendingCount: 0,
      syncQueueSize: 0,
    },
    {
      category: 'entities',
      totalCount: 50,
      realTimeCount: 45,
      recentCount: 3,
      offlinePendingCount: 2,
      oldestPending: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      syncQueueSize: 1,
    },
  ],
  meta: {
    summary: {
      totalItems: 240,
      totalRealTime: 198,
      totalRecent: 30,
      totalOfflinePending: 12,
      totalQueueSize: 6,
      realTimePercentage: 83,
      recentPercentage: 13,
      offlinePendingPercentage: 5,
      oldestPending: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    categories: ['assessments', 'responses', 'incidents', 'entities'],
    thresholds: {
      realTimeMinutes: 5,
      recentHours: 1,
    },
    filters: {},
    includeDetails: true,
    lastUpdate: new Date().toISOString(),
  },
  message: 'Data freshness indicators retrieved successfully',
  timestamp: new Date().toISOString(),
};

describe('DataFreshnessIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDataFreshnessResponse),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    render(<DataFreshnessIndicator refreshInterval={1000} />);
    
    expect(screen.getByText('Loading sync status indicators...')).toBeInTheDocument();
    expect(screen.getByText('Data Freshness Tracking')).toBeInTheDocument();
  });

  it('displays data freshness overview after loading', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Sync status indicators and offline submission visibility')).toBeInTheDocument();
    });

    expect(screen.getByText('83%')).toBeInTheDocument(); // Real-time percentage
    expect(screen.getByText('5%')).toBeInTheDocument(); // Offline pending percentage
    expect(screen.getByText('6')).toBeInTheDocument(); // Total queue size
  });

  it('displays freshness status badge correctly', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('GOOD')).toBeInTheDocument(); // 83% real-time = GOOD status
    });
  });

  it('shows detailed category breakdown when showDetailedView is true', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      expect(screen.getByText('Data Freshness by Category')).toBeInTheDocument();
      expect(screen.getByText('Assessments')).toBeInTheDocument();
      expect(screen.getByText('Responses')).toBeInTheDocument();
      expect(screen.getByText('Incidents')).toBeInTheDocument();
      expect(screen.getByText('Entities')).toBeInTheDocument();
    });
  });

  it('displays progress bars for each category in detailed view', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBe(4); // One for each category
    });
  });

  it('shows oldest pending timestamp when available', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Oldest pending: \d+h ago/)).toHaveLength(4); // One for each category plus summary
    });
  });

  it('displays queue size indicators for categories with pending items', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      expect(screen.getByText('3 queued')).toBeInTheDocument(); // Assessments queue
      expect(screen.getByText('2 queued')).toBeInTheDocument(); // Responses queue
    });
  });

  it('shows high offline pending warning', async () => {
    const highOfflineResponse = {
      ...mockDataFreshnessResponse,
      data: [
        ...mockDataFreshnessResponse.data.slice(0, 1),
        {
          category: 'responses',
          totalCount: 100,
          realTimeCount: 60,
          recentCount: 15,
          offlinePendingCount: 25, // 25% offline pending
          syncQueueSize: 10,
        },
      ],
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(highOfflineResponse),
    });

    render(<DataFreshnessIndicator refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      expect(screen.getByText(/High offline pending rate \(25%\)/)).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    render(<DataFreshnessIndicator refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('83%')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('makes API call with correct endpoint', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/situation/data-freshness?includeDetails=true');
    });
  });

  it('applies category filter when provided', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} categoryFilter="assessments" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/situation/data-freshness?category=assessments&includeDetails=true');
    });
  });

  it('updates data at specified intervals', async () => {
    jest.useFakeTimers();
    
    render(<DataFreshnessIndicator refreshInterval={5000} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('displays sync queue status when items are queued', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Sync Queue Status')).toBeInTheDocument();
      expect(screen.getByText('6 items currently processing or waiting to sync')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<DataFreshnessIndicator refreshInterval={1000} />);

    await waitFor(() => {
      // Should not crash and should display component title
      expect(screen.getByText('Data Freshness Tracking')).toBeInTheDocument();
    });
  });

  it('formats category names correctly', async () => {
    render(<DataFreshnessIndicator refreshInterval={1000} showDetailedView={true} />);

    await waitFor(() => {
      expect(screen.getByText('Assessments')).toBeInTheDocument();
      expect(screen.getByText('Responses')).toBeInTheDocument();
      expect(screen.getByText('Incidents')).toBeInTheDocument();
      expect(screen.getByText('Entities')).toBeInTheDocument();
    });
  });
});