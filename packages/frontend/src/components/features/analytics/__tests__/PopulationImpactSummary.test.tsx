import { render, screen } from '@testing-library/react';
import { PopulationImpactSummary } from '../PopulationImpactSummary';

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
    livesLost: 25,
    injured: 150,
    displaced: 800,
    housesAffected: 200
  },
  aggregates: {
    affectedEntities: 5,
    totalAffectedPopulation: 2000,
    totalAffectedHouseholds: 450
  }
};

describe('PopulationImpactSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: null,
      isLoadingSummary: true,
    });

    render(<PopulationImpactSummary />);
    
    expect(screen.getByText('Population Impact')).toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state when no incident is selected', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: null,
      isLoadingSummary: false,
    });

    render(<PopulationImpactSummary />);
    
    expect(screen.getByText('Population Impact')).toBeInTheDocument();
    expect(screen.getByText('Select an incident to view impact data')).toBeInTheDocument();
  });

  it('renders all population impact metrics', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: mockIncidentSummary,
      isLoadingSummary: false,
    });

    render(<PopulationImpactSummary />);
    
    expect(screen.getByText('Lives Lost')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    
    expect(screen.getByText('Injured')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    
    expect(screen.getByText('Displaced')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
    
    expect(screen.getByText('Houses Affected')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('renders aggregate information correctly', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: mockIncidentSummary,
      isLoadingSummary: false,
    });

    render(<PopulationImpactSummary />);
    
    expect(screen.getByText('Aggregate Information')).toBeInTheDocument();
    
    expect(screen.getByText('Affected Entities')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    
    expect(screen.getByText('Total Population')).toBeInTheDocument();
    expect(screen.getByText('2,000')).toBeInTheDocument();
    
    expect(screen.getByText('Total Households')).toBeInTheDocument();
    expect(screen.getByText('450')).toBeInTheDocument();
  });

  it('calculates and displays impact rates correctly', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: mockIncidentSummary,
      isLoadingSummary: false,
    });

    render(<PopulationImpactSummary />);
    
    expect(screen.getByText('Casualty Rate')).toBeInTheDocument();
    expect(screen.getByText('8.8%')).toBeInTheDocument();
    
    expect(screen.getByText('Displacement Rate')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
  });

  it('handles zero population correctly', () => {
    const zeroPopulationSummary = {
      ...mockIncidentSummary,
      aggregates: {
        ...mockIncidentSummary.aggregates,
        totalAffectedPopulation: 0
      }
    };

    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: zeroPopulationSummary,
      isLoadingSummary: false,
    });

    render(<PopulationImpactSummary />);
    
    const percentageElements = screen.getAllByText('0%');
    expect(percentageElements.length).toBe(2); // Both casualty and displacement rates should be 0%
  });

  it('formats large numbers with commas', () => {
    const largeNumberSummary = {
      ...mockIncidentSummary,
      populationImpact: {
        ...mockIncidentSummary.populationImpact,
        displaced: 12345
      },
      aggregates: {
        ...mockIncidentSummary.aggregates,
        totalAffectedPopulation: 56789
      }
    };

    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: largeNumberSummary,
      isLoadingSummary: false,
    });

    render(<PopulationImpactSummary />);
    
    expect(screen.getByText('12,345')).toBeInTheDocument();
    expect(screen.getByText('56,789')).toBeInTheDocument();
  });

  it('renders both Population Impact and Aggregate Information cards', () => {
    mockUseAnalyticsSummary.mockReturnValue({
      incidentSummary: mockIncidentSummary,
      isLoadingSummary: false,
    });

    render(<PopulationImpactSummary />);
    
    const populationImpactCards = screen.getAllByText('Population Impact');
    expect(populationImpactCards.length).toBe(1);
    
    expect(screen.getByText('Aggregate Information')).toBeInTheDocument();
    expect(screen.getByText('Impact Summary')).toBeInTheDocument();
  });
});