import { render, screen } from '@testing-library/react';
import { RightPanel } from '../RightPanel';

jest.mock('../EntityGapsGrid', () => ({
  EntityGapsGrid: ({ entityGaps, isLoading }: { entityGaps: any[]; isLoading?: boolean }) => (
    <div data-testid="entity-gaps-grid">
      {isLoading ? 'Loading...' : `Entity Gaps: ${entityGaps.length} entities`}
    </div>
  ),
}));

jest.mock('../QuickStatistics', () => ({
  QuickStatistics: ({ statistics, isLoading }: { statistics: any; isLoading?: boolean }) => (
    <div data-testid="quick-statistics">
      {isLoading ? 'Loading...' : `Statistics: ${statistics.totalCriticalGaps} critical`}
    </div>
  ),
}));

jest.mock('@/stores/analytics.store', () => ({
  useAnalyticsEntityGaps: jest.fn(),
  useAnalyticsIncidents: jest.fn(),
}));

const mockUseAnalyticsEntityGaps = require('@/stores/analytics.store').useAnalyticsEntityGaps;
const mockUseAnalyticsIncidents = require('@/stores/analytics.store').useAnalyticsIncidents;

describe('RightPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no incident is selected', () => {
    mockUseAnalyticsIncidents.mockReturnValue({
      selectedIncident: null,
    });
    mockUseAnalyticsEntityGaps.mockReturnValue({
      entityGapsSummary: null,
      isLoadingEntityGaps: false,
    });

    render(<RightPanel />);
    
    expect(screen.getByText('Entity Gaps & Statistics')).toBeInTheDocument();
    expect(screen.getByText('Select an incident to view entity gaps and statistics')).toBeInTheDocument();
    expect(screen.getByText(/No incident selected/)).toBeInTheDocument();
  });

  it('renders components when incident is selected with data', () => {
    const mockIncident = {
      id: 'incident-1',
      name: 'Test Incident',
      type: 'Flood',
      status: 'ACTIVE',
      declarationDate: '2024-01-01',
    };

    const mockEntityGaps = [
      {
        entityId: 'entity-1',
        entityName: 'Test Entity',
        assessmentAreas: {
          Health: 'red' as const,
          WASH: 'yellow' as const,
          Food: 'green' as const,
          Shelter: 'red' as const,
          Security: 'yellow' as const,
        },
      },
    ];

    const mockStatistics = {
      overallSeverity: {
        Health: 'red' as const,
        WASH: 'yellow' as const,
        Food: 'green' as const,
        Shelter: 'red' as const,
        Security: 'yellow' as const,
      },
      totalCriticalGaps: 5,
      totalModerateGaps: 3,
      totalMinimalGaps: 2,
    };

    mockUseAnalyticsIncidents.mockReturnValue({
      selectedIncident: mockIncident,
    });
    mockUseAnalyticsEntityGaps.mockReturnValue({
      entityGapsSummary: {
        entityGaps: mockEntityGaps,
        quickStatistics: mockStatistics,
      },
      isLoadingEntityGaps: false,
    });

    render(<RightPanel />);
    
    expect(screen.getByText('Entity Gaps & Statistics')).toBeInTheDocument();
    expect(screen.getByText(/Gap analysis and key metrics for Test Incident/)).toBeInTheDocument();
    expect(screen.getByTestId('entity-gaps-grid')).toBeInTheDocument();
    expect(screen.getByTestId('quick-statistics')).toBeInTheDocument();
    expect(screen.getByText('Entity Gaps: 1 entities')).toBeInTheDocument();
    expect(screen.getByText('Statistics: 5 critical')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const mockIncident = {
      id: 'incident-1',
      name: 'Test Incident',
      type: 'Flood',
      status: 'ACTIVE',
      declarationDate: '2024-01-01',
    };

    mockUseAnalyticsIncidents.mockReturnValue({
      selectedIncident: mockIncident,
    });
    mockUseAnalyticsEntityGaps.mockReturnValue({
      entityGapsSummary: null,
      isLoadingEntityGaps: true,
    });

    render(<RightPanel />);
    
    expect(screen.getByTestId('entity-gaps-grid')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders only EntityGapsGrid when quickStatistics is null', () => {
    const mockIncident = {
      id: 'incident-1',
      name: 'Test Incident',
      type: 'Flood',
      status: 'ACTIVE',
      declarationDate: '2024-01-01',
    };

    mockUseAnalyticsIncidents.mockReturnValue({
      selectedIncident: mockIncident,
    });
    mockUseAnalyticsEntityGaps.mockReturnValue({
      entityGapsSummary: {
        entityGaps: [],
        quickStatistics: null,
      },
      isLoadingEntityGaps: false,
    });

    render(<RightPanel />);
    
    expect(screen.getByTestId('entity-gaps-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-statistics')).not.toBeInTheDocument();
  });

  it('applies correct layout classes', () => {
    mockUseAnalyticsIncidents.mockReturnValue({
      selectedIncident: null,
    });
    mockUseAnalyticsEntityGaps.mockReturnValue({
      entityGapsSummary: null,
      isLoadingEntityGaps: false,
    });

    const { container } = render(<RightPanel />);
    
    const card = container.querySelector('.h-full');
    expect(card).toBeInTheDocument();
    
    const content = container.querySelector('.h-\\[calc\\(100\\%-120px\\)\\]');
    expect(content).toBeInTheDocument();
  });
});