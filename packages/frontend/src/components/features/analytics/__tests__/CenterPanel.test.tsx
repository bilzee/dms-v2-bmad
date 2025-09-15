import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CenterPanel } from '../CenterPanel';
import { useAnalyticsStore } from '@/stores/analytics.store';

// Mock the analytics store
jest.mock('@/stores/analytics.store');
const mockUseAnalyticsStore = useAnalyticsStore as jest.MockedFunction<typeof useAnalyticsStore>;

// Mock child components
jest.mock('../EntitySelector', () => ({
  EntitySelector: ({ onEntityChange, selectedEntityId }: any) => (
    <div data-testid="entity-selector">
      <button onClick={() => onEntityChange('entity-1')}>
        Select Entity 1
      </button>
      <span>Selected: {selectedEntityId || 'none'}</span>
    </div>
  ),
}));

jest.mock('../AssessmentAreaBreakdown', () => ({
  AssessmentAreaBreakdown: ({ selectedEntityId, selectedAreas, maxDisplayAreas }: any) => (
    <div data-testid="assessment-area-breakdown">
      Entity: {selectedEntityId}
      Areas: {selectedAreas?.join(',') || 'all'}
      Max: {maxDisplayAreas || 'unlimited'}
    </div>
  ),
}));

jest.mock('../AreaSelectionManager', () => ({
  AreaSelectionManager: ({ selectedAreas, onAreasChange, maxDisplayAreas }: any) => (
    <div data-testid="area-selection-manager">
      <button onClick={() => onAreasChange(['Health', 'WASH'])}>
        Change Areas
      </button>
      <span>Selected: {selectedAreas.join(',')}</span>
      <span>Max: {maxDisplayAreas}</span>
    </div>
  ),
}));

// Mock window.innerHeight for space calculations
Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 1080,
});

describe('CenterPanel', () => {
  const mockSelectedIncident = {
    id: 'incident-1',
    name: 'Test Incident',
    type: 'Flood',
    status: 'ACTIVE' as const,
    declarationDate: '2023-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockSelectedIncident,
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders with correct title and description', () => {
    render(<CenterPanel />);

    expect(screen.getByText('Assessment Area Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Assessment areas with latest data and gap analysis for selected entities')).toBeInTheDocument();
  });

  it('displays entity selector', () => {
    render(<CenterPanel />);

    expect(screen.getByTestId('entity-selector')).toBeInTheDocument();
    expect(screen.getByText('Selected: none')).toBeInTheDocument();
  });

  it('shows placeholder when no incident selected', () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: null,
    } as any);

    render(<CenterPanel />);

    expect(screen.getByText('Assessment Area Analysis')).toBeInTheDocument();
    expect(screen.getByText('Select an incident from the left panel to begin')).toBeInTheDocument();
  });

  it('shows placeholder when incident selected but no entity', () => {
    render(<CenterPanel />);

    expect(screen.getByText('Assessment Area Analysis')).toBeInTheDocument();
    expect(screen.getByText('Select an affected entity to view assessment breakdown')).toBeInTheDocument();
  });

  it('handles entity selection and displays assessment breakdown', () => {
    render(<CenterPanel />);

    // Initially no entity selected
    expect(screen.queryByTestId('assessment-area-breakdown')).not.toBeInTheDocument();

    // Select an entity
    fireEvent.click(screen.getByText('Select Entity 1'));

    // Should now show assessment breakdown
    expect(screen.getByTestId('assessment-area-breakdown')).toBeInTheDocument();
    expect(screen.getByText('Entity: entity-1')).toBeInTheDocument();
  });

  it('calculates space constraints correctly', () => {
    render(<CenterPanel />);

    // Select an entity to trigger area breakdown
    fireEvent.click(screen.getByText('Select Entity 1'));

    // Should show area selection manager when space is constrained
    expect(screen.getByTestId('area-selection-manager')).toBeInTheDocument();
  });

  it('handles area selection changes', () => {
    render(<CenterPanel />);

    // Select an entity first
    fireEvent.click(screen.getByText('Select Entity 1'));

    // Should show area selection manager
    const areaManager = screen.getByTestId('area-selection-manager');
    expect(areaManager).toBeInTheDocument();

    // Change areas
    fireEvent.click(screen.getByText('Change Areas'));

    // Should update the selected areas
    expect(screen.getByText('Selected: Health,WASH')).toBeInTheDocument();
  });

  it('resets entity selection when incident changes', () => {
    const { rerender } = render(<CenterPanel />);

    // Select an entity
    fireEvent.click(screen.getByText('Select Entity 1'));
    expect(screen.getByText('Selected: entity-1')).toBeInTheDocument();

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

    rerender(<CenterPanel />);

    // Entity should be reset
    expect(screen.getByText('Selected: none')).toBeInTheDocument();
  });

  it('passes space management props correctly', () => {
    render(<CenterPanel />);

    // Select an entity to show breakdown
    fireEvent.click(screen.getByText('Select Entity 1'));

    const breakdown = screen.getByTestId('assessment-area-breakdown');
    expect(breakdown).toHaveTextContent('Max: 3'); // Default max areas

    const areaManager = screen.getByTestId('area-selection-manager');
    expect(areaManager).toHaveTextContent('Max: 3');
  });

  it('displays interactive map placeholder', () => {
    render(<CenterPanel />);

    expect(screen.getByText('Interactive Map')).toBeInTheDocument();
    expect(screen.getByText('Entity locations and assessment data visualization will be displayed here')).toBeInTheDocument();
  });

  it('handles window resize for space calculation', async () => {
    render(<CenterPanel />);

    // Select an entity to trigger space management
    fireEvent.click(screen.getByText('Select Entity 1'));

    // Change window height
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600, // Smaller height
    });

    // Trigger resize event
    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      // Should recalculate max areas based on new height
      const areaManager = screen.getByTestId('area-selection-manager');
      expect(areaManager).toBeInTheDocument();
    });
  });

  it('shows only area selection manager when space is constrained and entity is selected', () => {
    render(<CenterPanel />);

    // Initially no area selection manager (no entity selected)
    expect(screen.queryByTestId('area-selection-manager')).not.toBeInTheDocument();

    // Select an entity
    fireEvent.click(screen.getByText('Select Entity 1'));

    // Should now show area selection manager (space is constrained by default)
    expect(screen.getByTestId('area-selection-manager')).toBeInTheDocument();
  });

  it('passes selected areas to assessment breakdown when space is constrained', () => {
    render(<CenterPanel />);

    // Select an entity
    fireEvent.click(screen.getByText('Select Entity 1'));

    // Initially shows default areas
    let breakdown = screen.getByTestId('assessment-area-breakdown');
    expect(breakdown).toHaveTextContent('Areas: Health,WASH,Food');

    // Change areas
    fireEvent.click(screen.getByText('Change Areas'));

    // Should update areas in breakdown
    breakdown = screen.getByTestId('assessment-area-breakdown');
    expect(breakdown).toHaveTextContent('Areas: Health,WASH');
  });

  it('passes unlimited areas when no space constraint', () => {
    // Mock a larger window height to remove space constraints
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 2000, // Very large height
    });

    render(<CenterPanel />);

    // Select an entity
    fireEvent.click(screen.getByText('Select Entity 1'));

    // Should not show area selection manager (no space constraint)
    expect(screen.queryByTestId('area-selection-manager')).not.toBeInTheDocument();

    // Assessment breakdown should show all areas
    const breakdown = screen.getByTestId('assessment-area-breakdown');
    expect(breakdown).toHaveTextContent('Areas: all');
    expect(breakdown).toHaveTextContent('Max: unlimited');
  });
});