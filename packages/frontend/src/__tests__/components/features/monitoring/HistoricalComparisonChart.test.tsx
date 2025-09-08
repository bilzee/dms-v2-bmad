import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { HistoricalComparisonChart } from '@/components/features/monitoring/HistoricalComparisonChart';

global.fetch = jest.fn();

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

const mockHistoricalData = {
  success: true,
  data: {
    current: {
      date: '2025-08-31T00:00:00Z',
      metrics: {
        totalAssessments: 150,
        verifiedAssessments: 120,
        pendingAssessments: 20,
        rejectedAssessments: 10
      }
    },
    historical: [
      {
        date: '2025-08-30T00:00:00Z',
        metrics: {
          totalAssessments: 140,
          verifiedAssessments: 115,
          pendingAssessments: 15,
          rejectedAssessments: 10
        }
      },
      {
        date: '2025-08-29T00:00:00Z',
        metrics: {
          totalAssessments: 130,
          verifiedAssessments: 110,
          pendingAssessments: 12,
          rejectedAssessments: 8
        }
      }
    ],
    trends: [
      { metric: 'totalAssessments', change: 7.1, direction: 'up' },
      { metric: 'verifiedAssessments', change: 4.3, direction: 'up' },
      { metric: 'pendingAssessments', change: 33.3, direction: 'up' }
    ]
  }
};

describe('HistoricalComparisonChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistoricalData),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  it('renders loading state initially', () => {
    render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={jest.fn()}
      />
    );
    
    expect(screen.getByText('Historical Comparison')).toBeInTheDocument();
    expect(screen.getByText('Loading historical data...')).toBeInTheDocument();
  });

  it('displays chart after loading', async () => {
    render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
    });

    expect(screen.queryByText('Loading historical data...')).not.toBeInTheDocument();
  });

  it('shows trend indicators correctly', async () => {
    render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Total Assessments')).toBeInTheDocument();
    });

    expect(screen.getByText('+7.1%')).toBeInTheDocument();
    expect(screen.getByText('+4.3%')).toBeInTheDocument();
    expect(screen.getByText('+33.3%')).toBeInTheDocument();
  });

  it('handles different metric types', () => {
    const { rerender } = render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        metricTypes={["line"]}
        onMetricSelect={jest.fn()}
      />
    );

    // Rerender with different metric types
    rerender(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        metricTypes={["area"]}
        onMetricSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Historical Comparison')).toBeInTheDocument();
  });

  it('handles different time ranges', async () => {
    const { rerender } = render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="7d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('timeRange=7d')
      );
    });

    rerender(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('timeRange=30d')
      );
    });
  });

  it('calls onMetricSelect when metric is clicked', async () => {
    const mockOnMetricSelect = jest.fn();
    
    render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={mockOnMetricSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Total Assessments')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Total Assessments'));
    expect(mockOnMetricSelect).toHaveBeenCalledWith('totalAssessments');
  });

  it('displays comparison periods correctly', async () => {
    render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('vs. Previous Period')).toBeInTheDocument();
    });

    expect(screen.getByText('Current Period')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load historical data')).toBeInTheDocument();
    });
  });

  it('refreshes data when time range changes', async () => {
    const { rerender } = render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="7d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    rerender(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('displays empty state when no historical data', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          current: { date: '2025-08-31T00:00:00Z', metrics: {} },
          historical: [],
          trends: []
        }
      }),
    });

    render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No historical data available')).toBeInTheDocument();
    });
  });

  it('formats metric names correctly', async () => {
    render(
      <HistoricalComparisonChart 
        dataType="assessments" 
        timeRange="30d"
        onMetricSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Total Assessments')).toBeInTheDocument();
    });

    expect(screen.getByText('Verified Assessments')).toBeInTheDocument();
    expect(screen.getByText('Pending Assessments')).toBeInTheDocument();
    expect(screen.getByText('Rejected Assessments')).toBeInTheDocument();
  });
});