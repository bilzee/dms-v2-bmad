import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveDataOverview } from '@/components/features/monitoring/LiveDataOverview';

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

const mockSituationResponse = {
  success: true,
  data: {
    timestamp: new Date().toISOString(),
    totalAssessments: 150,
    totalResponses: 120,
    pendingVerification: 8,
    activeIncidents: 3,
    criticalGaps: 5,
    dataFreshness: {
      realTime: 200,
      recent: 50,
      offlinePending: 20,
    },
  },
  meta: {
    refreshInterval: 25,
    connectionStatus: 'connected',
    lastUpdate: new Date().toISOString(),
    dataSource: 'real-time',
  },
  message: 'Real-time situation overview retrieved successfully',
  timestamp: new Date().toISOString(),
};

describe('LiveDataOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSituationResponse),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    render(<LiveDataOverview refreshInterval={1000} />);
    
    expect(screen.getByText('Loading real-time situation data...')).toBeInTheDocument();
    expect(screen.getByText('Live Data Overview')).toBeInTheDocument();
  });

  it('displays live data overview after loading', async () => {
    render(<LiveDataOverview refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Real-time assessment and response data with timestamp indicators')).toBeInTheDocument();
    });

    expect(screen.getByText('150')).toBeInTheDocument(); // Total assessments
    expect(screen.getByText('120')).toBeInTheDocument(); // Total responses
    expect(screen.getByText('3')).toBeInTheDocument(); // Active incidents
    expect(screen.getByText('5')).toBeInTheDocument(); // Critical gaps
  });

  it('calculates response rate correctly', async () => {
    render(<LiveDataOverview refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('80% rate')).toBeInTheDocument(); // 120/150 * 100 = 80%
    });
  });

  it('displays data freshness status badge', async () => {
    render(<LiveDataOverview refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('GOOD')).toBeInTheDocument(); // 200/270 = 74% real-time
    });
  });

  it('shows connection status when enabled', async () => {
    render(<LiveDataOverview refreshInterval={1000} showConnectionStatus={true} />);

    await waitFor(() => {
      expect(screen.getByText('connected')).toBeInTheDocument();
    });
  });

  it('hides connection status when disabled', async () => {
    render(<LiveDataOverview refreshInterval={1000} showConnectionStatus={false} />);

    await waitFor(() => {
      expect(screen.queryByText('connected')).not.toBeInTheDocument();
    });
  });

  it('displays data freshness breakdown', async () => {
    render(<LiveDataOverview refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Real-time')).toBeInTheDocument();
      expect(screen.getByText('Recent')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('handles error state gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<LiveDataOverview refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load live data')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch situation overview. Please try refreshing.')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    render(<LiveDataOverview refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('disables auto-refresh when autoRefresh is false', async () => {
    jest.useFakeTimers();
    
    render(<LiveDataOverview refreshInterval={5000} autoRefresh={false} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    // Should still be 1 call since auto-refresh is disabled
    expect(fetch).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('updates data at specified intervals when auto-refresh enabled', async () => {
    jest.useFakeTimers();
    
    render(<LiveDataOverview refreshInterval={5000} autoRefresh={true} />);

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

  it('displays timestamp information correctly', async () => {
    render(<LiveDataOverview refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText(/Last Update:/)).toBeInTheDocument();
      expect(screen.getByText(/Data Timestamp:/)).toBeInTheDocument();
      expect(screen.getByText(/Verification Queue:/)).toBeInTheDocument();
    });
  });

  it('handles different connection statuses', async () => {
    const offlineResponse = {
      ...mockSituationResponse,
      meta: {
        ...mockSituationResponse.meta,
        connectionStatus: 'offline',
      },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(offlineResponse),
    });

    render(<LiveDataOverview refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('offline')).toBeInTheDocument();
    });
  });

  it('formats time since correctly', async () => {
    const oldTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const responseWithOldTimestamp = {
      ...mockSituationResponse,
      data: {
        ...mockSituationResponse.data,
        timestamp: oldTimestamp.toISOString(),
      },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseWithOldTimestamp),
    });

    render(<LiveDataOverview refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText(/\d+h ago/)).toBeInTheDocument();
    });
  });
});