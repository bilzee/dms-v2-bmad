import { render, screen } from '@testing-library/react';
import { IncidentTimeline } from '../IncidentTimeline';

jest.mock('@/stores/analytics.store', () => ({
  useAnalyticsSummary: jest.fn(),
}));

const mockUseAnalyticsSummary = require('@/stores/analytics.store').useAnalyticsSummary;

const mockIncidentSummary = {
  incident: {
    id: '1',
    title: 'Test Incident',
    status: 'ACTIVE' as const,
    declarationDate: '2025-01-10T10:00:00Z',
    currentDate: '2025-01-15T15:30:00Z',
    duration: {
      days: 5,
      hours: 5,
      formatted: '5 days, 5 hours'
    }
  },
  populationImpact: {
    livesLost: 10,
    injured: 50,
    displaced: 200,
    housesAffected: 75
  },
  aggregates: {
    affectedEntities: 3,
    totalAffectedPopulation: 1000,
    totalAffectedHouseholds: 200
  }
};

describe('IncidentTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: null,
      isLoadingSummary: true,
    });

    render(<IncidentTimeline />);
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state when no incident is selected', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: null,
      isLoadingSummary: false,
    });

    render(<IncidentTimeline />);
    
    expect(screen.getByText('Select an incident to view timeline')).toBeInTheDocument();
  });

  it('renders incident timeline with all required information', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: mockIncidentSummary,
      isLoadingSummary: false,
    });

    render(<IncidentTimeline />);
    
    expect(screen.getByText('Incident Timeline')).toBeInTheDocument();
    expect(screen.getByText('Declaration Date')).toBeInTheDocument();
    expect(screen.getByText('Current Date')).toBeInTheDocument();
    expect(screen.getByText('5 days, 5 hours')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: mockIncidentSummary,
      isLoadingSummary: false,
    });

    render(<IncidentTimeline />);
    
    expect(screen.getByText(/Jan 10, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2025/)).toBeInTheDocument();
  });

  it('applies correct status styling for different statuses', () => {
    const activeIncident = { ...mockIncidentSummary.incident, status: 'ACTIVE' as const };
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: { ...mockIncidentSummary, incident: activeIncident },
      isLoadingSummary: false,
    });

    render(<IncidentTimeline />);
    
    const statusBadge = screen.getByText('ACTIVE');
    expect(statusBadge).toHaveClass('text-red-600');

    const containedIncident = { ...mockIncidentSummary.incident, status: 'CONTAINED' as const };
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: { ...mockIncidentSummary, incident: containedIncident },
      isLoadingSummary: false,
    });

    render(<IncidentTimeline />);
    
    const containedBadge = screen.getByText('CONTAINED');
    expect(containedBadge).toHaveClass('text-orange-600');
  });

  it('displays correct duration status text', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: mockIncidentSummary,
      isLoadingSummary: false,
    });

    render(<IncidentTimeline />);
    
    expect(screen.getByText('Active for')).toBeInTheDocument();
  });
});