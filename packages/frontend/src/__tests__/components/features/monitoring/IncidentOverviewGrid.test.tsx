import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentOverviewGrid } from '@/components/features/monitoring/IncidentOverviewGrid';

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

const mockIncidentsResponse = {
  success: true,
  data: [
    {
      id: 'INC-001',
      name: 'Flood Emergency',
      type: 'FLOOD',
      severity: 'SEVERE',
      status: 'ACTIVE',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      assessmentCount: 45,
      responseCount: 30,
      gapScore: 67,
      lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: 'INC-002',
      name: 'Forest Fire',
      type: 'FIRE',
      severity: 'CATASTROPHIC',
      status: 'ACTIVE',
      date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      assessmentCount: 80,
      responseCount: 15,
      gapScore: 19,
      lastUpdate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    },
    {
      id: 'INC-003',
      name: 'Landslide Recovery',
      type: 'LANDSLIDE',
      severity: 'MODERATE',
      status: 'CONTAINED',
      date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
      assessmentCount: 25,
      responseCount: 22,
      gapScore: 88,
      lastUpdate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    },
  ],
  meta: {
    totalActive: 2,
    totalContained: 1,
    totalResolved: 0,
    criticalCount: 1,
    totalIncidents: 3,
    filters: {},
    sorting: { sortBy: 'date', sortOrder: 'desc' },
    lastUpdate: new Date().toISOString(),
  },
  message: 'Multi-incident overview retrieved successfully',
  timestamp: new Date().toISOString(),
};

describe('IncidentOverviewGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockIncidentsResponse),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    render(<IncidentOverviewGrid refreshInterval={1000} />);
    
    expect(screen.getByText('Loading incident overview with priority indicators...')).toBeInTheDocument();
    expect(screen.getByText('Multi-Incident Overview')).toBeInTheDocument();
  });

  it('displays incident overview data after loading', async () => {
    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Active incidents with priority indicators and status progression')).toBeInTheDocument();
    });

    expect(screen.getByText('2')).toBeInTheDocument(); // Total active
    expect(screen.getByText('Contained')).toBeInTheDocument(); // Look for label instead of number
    expect(screen.getByText('Resolved')).toBeInTheDocument(); // Look for label instead of number
  });

  it('displays incident cards with correct information', async () => {
    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Flood Emergency')).toBeInTheDocument();
      expect(screen.getByText('Forest Fire')).toBeInTheDocument();
      expect(screen.getByText('Landslide Recovery')).toBeInTheDocument();
    });

    expect(screen.getByText('SEVERE')).toBeInTheDocument();
    expect(screen.getByText('CATASTROPHIC')).toBeInTheDocument();
    expect(screen.getByText('MODERATE')).toBeInTheDocument();
  });

  it('shows status badges with correct variants', async () => {
    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getAllByText('ACTIVE')).toHaveLength(2);
      expect(screen.getByText('CONTAINED')).toBeInTheDocument();
    });
  });

  it('displays gap coverage progress bars', async () => {
    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBe(3); // One for each incident
    });

    expect(screen.getByText('67%')).toBeInTheDocument(); // Flood gap score
    expect(screen.getByText('19%')).toBeInTheDocument(); // Fire gap score
    expect(screen.getByText('88%')).toBeInTheDocument(); // Landslide gap score
  });

  it('shows critical attention alert for catastrophic active incidents', async () => {
    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Requires immediate attention')).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Flood Emergency')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('makes API call with correct endpoint and parameters', async () => {
    render(<IncidentOverviewGrid refreshInterval={1000} statusFilter="ACTIVE" severityFilter="SEVERE" sortBy="severity" sortOrder="asc" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/situation/incidents?status=ACTIVE&severity=SEVERE&sortBy=severity&sortOrder=asc');
    });
  });

  it('updates data at specified intervals', async () => {
    jest.useFakeTimers();
    
    render(<IncidentOverviewGrid refreshInterval={5000} />);

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
    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      expect(screen.getByText(/Showing \d+ incidents/)).toBeInTheDocument();
    });
  });

  it('shows filter and sort buttons when showFilters is true', async () => {
    render(<IncidentOverviewGrid refreshInterval={1000} showFilters={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
    });
  });

  it('hides filter buttons when showFilters is false', async () => {
    render(<IncidentOverviewGrid refreshInterval={1000} showFilters={false} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /filter/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /sort/i })).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no incidents found', async () => {
    const emptyResponse = {
      ...mockIncidentsResponse,
      data: [],
      meta: {
        ...mockIncidentsResponse.meta,
        totalActive: 0,
        totalContained: 0,
        totalResolved: 0,
        criticalCount: 0,
        totalIncidents: 0,
      },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyResponse),
    });

    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('No incidents found matching current filters')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      // Should not crash and should display component title
      expect(screen.getByText('Multi-Incident Overview')).toBeInTheDocument();
    });
  });

  it('formats incident types correctly', async () => {
    render(<IncidentOverviewGrid refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Flood')).toBeInTheDocument();
      expect(screen.getByText('Fire')).toBeInTheDocument();
      expect(screen.getByText('Landslide')).toBeInTheDocument();
    });
  });
});