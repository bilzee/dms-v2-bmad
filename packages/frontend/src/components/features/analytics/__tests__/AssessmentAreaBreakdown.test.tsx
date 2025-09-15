import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AssessmentAreaBreakdown } from '../AssessmentAreaBreakdown';
import { useAnalyticsStore } from '@/stores/analytics.store';

// Mock the analytics store
jest.mock('@/stores/analytics.store');
const mockUseAnalyticsStore = useAnalyticsStore as jest.MockedFunction<typeof useAnalyticsStore>;

// Mock the GapAnalysisView component
jest.mock('../GapAnalysisView', () => ({
  GapAnalysisView: ({ gapAnalysis }: any) => (
    <div data-testid="gap-analysis-view">
      Gap Severity: {gapAnalysis.gapSeverity}
    </div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AssessmentAreaBreakdown', () => {
  const mockSelectedIncident = {
    id: 'incident-1',
    name: 'Test Incident',
    type: 'Flood',
    status: 'ACTIVE' as const,
    declarationDate: '2023-01-01',
  };

  const mockAssessmentAreas = [
    {
      area: 'Health' as const,
      latestAssessment: {
        timestamp: '2023-01-01T12:00:00Z',
        severity: 'HIGH' as const,
        details: 'Medical facilities overwhelmed, urgent need for supplies',
      },
      gapAnalysis: {
        responseGap: true,
        unmetNeeds: 65,
        responseTimestamp: '2023-01-01T10:00:00Z',
        gapSeverity: 'HIGH' as const,
      },
    },
    {
      area: 'WASH' as const,
      latestAssessment: {
        timestamp: '2023-01-01T11:30:00Z',
        severity: 'MEDIUM' as const,
        details: 'Water sources contaminated, sanitation systems compromised',
      },
      gapAnalysis: {
        responseGap: false,
        unmetNeeds: 0,
        responseTimestamp: '2023-01-01T13:00:00Z',
        gapSeverity: 'LOW' as const,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockSelectedIncident,
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows message when no incident or entity selected', () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: null,
    } as any);

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId={null}
      />
    );

    expect(screen.getByText('Select an incident and entity to view assessment breakdown')).toBeInTheDocument();
  });

  it('shows message when incident selected but no entity', () => {
    render(
      <AssessmentAreaBreakdown 
        selectedEntityId={null}
      />
    );

    expect(screen.getByText('Select an incident and entity to view assessment breakdown')).toBeInTheDocument();
  });

  it('fetches and displays assessment breakdown data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { assessmentAreas: mockAssessmentAreas },
      }),
    });

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/monitoring/analytics/assessments/breakdown')
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('WASH')).toBeInTheDocument();
      expect(screen.getByText('Medical facilities overwhelmed, urgent need for supplies')).toBeInTheDocument();
      expect(screen.getByText('Water sources contaminated, sanitation systems compromised')).toBeInTheDocument();
    });
  });

  it('displays loading state while fetching data', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
      />
    );

    // Check for loading skeleton
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(5);
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading assessment data: Network error/)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading assessment data/)).toBeInTheDocument();
    });
  });

  it('shows message when no assessment data available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { assessmentAreas: [] },
      }),
    });

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No assessment data available for the selected entity')).toBeInTheDocument();
    });
  });

  it('displays severity badges correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { assessmentAreas: mockAssessmentAreas },
      }),
    });

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });
  });

  it('formats timestamps correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { assessmentAreas: mockAssessmentAreas },
      }),
    });

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
      />
    );

    await waitFor(() => {
      // Check that timestamps are formatted and displayed
      // The exact format depends on locale, but should contain date/time
      expect(screen.getByText(/1\/1\/2023|2023|12:00|11:30/)).toBeInTheDocument();
    });
  });

  it('includes gap analysis for each area', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { assessmentAreas: mockAssessmentAreas },
      }),
    });

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
      />
    );

    await waitFor(() => {
      const gapAnalysisViews = screen.getAllByTestId('gap-analysis-view');
      expect(gapAnalysisViews).toHaveLength(2);
      expect(screen.getByText('Gap Severity: HIGH')).toBeInTheDocument();
      expect(screen.getByText('Gap Severity: LOW')).toBeInTheDocument();
    });
  });

  it('includes selected areas in API request when provided', async () => {
    const selectedAreas = ['Health', 'Food'];

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
        selectedAreas={selectedAreas}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('assessmentAreas=Health%2CFood')
      );
    });
  });

  it('limits displayed areas when maxDisplayAreas is set', async () => {
    const manyAreas = Array.from({ length: 5 }, (_, i) => ({
      area: ['Health', 'WASH', 'Food', 'Shelter', 'Security'][i] as any,
      latestAssessment: {
        timestamp: '2023-01-01T12:00:00Z',
        severity: 'MEDIUM' as const,
        details: `Area ${i + 1} assessment`,
      },
      gapAnalysis: {
        responseGap: false,
        unmetNeeds: 0,
        responseTimestamp: '2023-01-01T13:00:00Z',
        gapSeverity: 'LOW' as const,
      },
    }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { assessmentAreas: manyAreas.slice(0, 3) }, // API should limit to 3
      }),
    });

    render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
        maxDisplayAreas={3}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Showing 3 assessment areas (limited to 3)')).toBeInTheDocument();
    });
  });

  it('refetches data when entity or incident changes', async () => {
    const { rerender } = render(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-1"
      />
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Change entity
    rerender(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-2"
      />
    );

    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Change incident
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: {
        id: 'incident-2',
        name: 'New Incident',
        type: 'Fire',
        status: 'ACTIVE' as const,
        declarationDate: '2023-01-02',
      },
    } as any);

    rerender(
      <AssessmentAreaBreakdown 
        selectedEntityId="entity-2"
      />
    );

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});