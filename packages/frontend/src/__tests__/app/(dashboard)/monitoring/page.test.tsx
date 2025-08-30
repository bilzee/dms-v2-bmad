import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SituationDisplay from '@/app/(dashboard)/monitoring/page';

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
    totalAssessments: 245,
    totalResponses: 198,
    pendingVerification: 12,
    activeIncidents: 5,
    criticalGaps: 8,
    dataFreshness: {
      realTime: 320,
      recent: 85,
      offlinePending: 38,
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

describe('SituationDisplay', () => {
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
    render(<SituationDisplay />);
    
    expect(screen.getByText('Loading real-time assessment and response data...')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Situation Display')).toBeInTheDocument();
  });

  it('displays situation overview data after loading', async () => {
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Current disaster situation and response effectiveness overview')).toBeInTheDocument();
    });

    expect(screen.getByText('245')).toBeInTheDocument(); // Total assessments
    expect(screen.getByText('198')).toBeInTheDocument(); // Total responses
    expect(screen.getByText('5')).toBeInTheDocument(); // Active incidents
    expect(screen.getByText('8')).toBeInTheDocument(); // Critical gaps
  });

  it('calculates and displays response rate correctly', async () => {
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText('81% response rate')).toBeInTheDocument(); // 198/245 * 100 = 80.8% ≈ 81%
    });
  });

  it('displays data freshness percentages correctly', async () => {
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText('72%')).toBeInTheDocument(); // Real-time: 320/443 * 100 ≈ 72%
      expect(screen.getByText('19%')).toBeInTheDocument(); // Recent: 85/443 * 100 ≈ 19%
      expect(screen.getByText('9%')).toBeInTheDocument(); // Offline pending: 38/443 * 100 ≈ 9%
    });
  });

  it('shows connection status badge', async () => {
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText('CONNECTED')).toBeInTheDocument();
    });
  });

  it('displays error state when fetch fails', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load situation data')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch real-time situation data. Please check your connection and try refreshing.')).toBeInTheDocument();
  });

  it('makes API call with correct endpoint', async () => {
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/situation/overview');
    });
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText('245')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial load + refresh click
    });
  });

  it('updates data at specified intervals', async () => {
    jest.useFakeTimers();
    
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Advance time by 25 seconds (refresh interval)
    await act(async () => {
      jest.advanceTimersByTime(25000);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('handles different connection statuses', async () => {
    const degradedResponse = {
      ...mockSituationResponse,
      meta: {
        ...mockSituationResponse.meta,
        connectionStatus: 'degraded',
      },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(degradedResponse),
    });

    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText('DEGRADED')).toBeInTheDocument();
    });
  });

  it('displays timestamp information correctly', async () => {
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      expect(screen.getByText(/Data timestamp:/)).toBeInTheDocument();
      expect(screen.getByText(/Auto-refresh every 25 seconds/)).toBeInTheDocument();
    });
  });

  it('shows pending verification count', async () => {
    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Pending verification: 12')).toBeInTheDocument();
    });
  });

  it('handles zero data gracefully', async () => {
    const emptyResponse = {
      ...mockSituationResponse,
      data: {
        ...mockSituationResponse.data,
        totalAssessments: 0,
        totalResponses: 0,
        activeIncidents: 0,
        criticalGaps: 0,
      },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyResponse),
    });

    render(<SituationDisplay />);

    await waitFor(() => {
      expect(screen.getByText('0% response rate')).toBeInTheDocument();
    });
  });
});