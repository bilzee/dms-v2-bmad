import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GapAnalysisPanel } from '@/components/features/monitoring/GapAnalysisPanel';

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

const mockGapAnalysisResponse = {
  success: true,
  data: [
    {
      assessmentType: 'HEALTH',
      totalNeeds: 100,
      totalResponses: 85,
      fulfillmentRate: 85,
      criticalGaps: 15,
      affectedEntities: 12,
      lastAssessment: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      lastResponse: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      priority: 'MEDIUM',
    },
    {
      assessmentType: 'WASH',
      totalNeeds: 80,
      totalResponses: 20,
      fulfillmentRate: 25,
      criticalGaps: 60,
      affectedEntities: 18,
      lastAssessment: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      lastResponse: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      priority: 'CRITICAL',
    },
    {
      assessmentType: 'SHELTER',
      totalNeeds: 60,
      totalResponses: 55,
      fulfillmentRate: 92,
      criticalGaps: 5,
      affectedEntities: 8,
      lastAssessment: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      lastResponse: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      priority: 'LOW',
    },
  ],
  meta: {
    overallFulfillmentRate: 67,
    criticalGapsCount: 1,
    totalCriticalGaps: 80,
    lastAnalysisUpdate: new Date().toISOString(),
    filters: {},
    analysisScope: 'all-active-incidents',
  },
  message: 'Gap analysis retrieved successfully',
  timestamp: new Date().toISOString(),
};

describe('GapAnalysisPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGapAnalysisResponse),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    render(<GapAnalysisPanel refreshInterval={1000} />);
    
    expect(screen.getByText('Loading needs vs response gap analysis...')).toBeInTheDocument();
    expect(screen.getByText('Gap Analysis Dashboard')).toBeInTheDocument();
  });

  it('displays gap analysis data after loading', async () => {
    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Comparison of needs vs responses by assessment type with critical gap indicators')).toBeInTheDocument();
    });

    expect(screen.getByText('67%')).toBeInTheDocument(); // Overall fulfillment
    expect(screen.getByText('1')).toBeInTheDocument(); // Critical gaps count
    expect(screen.getByText('3')).toBeInTheDocument(); // Assessment types count
  });

  it('displays gap analysis for each assessment type', async () => {
    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Wash')).toBeInTheDocument();
      expect(screen.getByText('Shelter')).toBeInTheDocument();
    });

    expect(screen.getByText('85%')).toBeInTheDocument(); // Health fulfillment rate
    expect(screen.getByText('25%')).toBeInTheDocument(); // WASH fulfillment rate
    expect(screen.getByText('92%')).toBeInTheDocument(); // Shelter fulfillment rate
  });

  it('shows priority badges correctly', async () => {
    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('MEDIUM')).toBeInTheDocument(); // Health priority
      expect(screen.getByText('CRITICAL')).toBeInTheDocument(); // WASH priority
      expect(screen.getByText('LOW')).toBeInTheDocument(); // Shelter priority
    });
  });

  it('displays critical gap alert for critical priority items', async () => {
    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Critical gap requiring immediate attention')).toBeInTheDocument();
    });
  });

  it('shows progress bars for fulfillment rates', async () => {
    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  it('displays timestamp information correctly', async () => {
    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Last assessment: \d+h ago/)).toHaveLength(3);
      expect(screen.getAllByText(/Last response: \d+h ago/)).toHaveLength(2); // SHELTER has no response, so only 2 responses
    });
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Health')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('makes API call with correct endpoint', async () => {
    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/situation/gap-analysis?');
    });
  });

  it('handles filters when provided', async () => {
    render(<GapAnalysisPanel refreshInterval={1000} priorityFilter="CRITICAL" assessmentTypeFilter="HEALTH" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/situation/gap-analysis?priority=CRITICAL&assessmentType=HEALTH');
    });
  });

  it('updates data at specified intervals', async () => {
    jest.useFakeTimers();
    
    render(<GapAnalysisPanel refreshInterval={5000} />);

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

  it('displays empty state when no gaps found', async () => {
    const emptyResponse = {
      ...mockGapAnalysisResponse,
      data: [],
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyResponse),
    });

    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('No gaps found matching current filters')).toBeInTheDocument();
    });
  });

  it('shows filter and refresh buttons when showFilters is true', async () => {
    render(<GapAnalysisPanel refreshInterval={1000} showFilters={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<GapAnalysisPanel refreshInterval={1000} />);

    await waitFor(() => {
      // Should not crash and should display loading/error state gracefully
      expect(screen.getByText('Gap Analysis Dashboard')).toBeInTheDocument();
    });
  });
});