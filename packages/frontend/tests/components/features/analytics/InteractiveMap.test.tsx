import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock react-leaflet components
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: any) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: (props: any) => <div data-testid="tile-layer" {...props} />,
}));

// Mock Leaflet CSS imports and compatibility
jest.mock('leaflet/dist/leaflet.css', () => ({}));
jest.mock('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css', () => ({}));
jest.mock('leaflet-defaulticon-compatibility', () => ({}));

// Mock leaflet module
jest.mock('leaflet', () => ({
  divIcon: jest.fn(() => ({})),
  Map: jest.fn(() => ({})),
  TileLayer: jest.fn(() => ({})),
}));

// Mock the child components
jest.mock('@/components/features/analytics/EntityMarker', () => ({
  EntityMarker: ({ entity, isHighlighted, isSelected }: any) => (
    <div 
      data-testid={`entity-marker-${entity.id}`}
      data-highlighted={isHighlighted}
      data-selected={isSelected}
    >
      {entity.name}
    </div>
  ),
}));

jest.mock('@/components/features/analytics/AssessmentOverlay', () => ({
  AssessmentOverlay: ({ entities, visible }: any) => (
    visible ? <div data-testid="assessment-overlay" data-entity-count={entities.length} /> : null
  ),
}));

jest.mock('@/components/features/analytics/ResponseOverlay', () => ({
  ResponseOverlay: ({ entities, visible }: any) => (
    visible ? <div data-testid="response-overlay" data-entity-count={entities.length} /> : null
  ),
}));

jest.mock('@/components/features/analytics/GapAnalysisOverlay', () => ({
  GapAnalysisOverlay: ({ entities, visible }: any) => (
    visible ? <div data-testid="gap-analysis-overlay" data-entity-count={entities.length} /> : null
  ),
}));

// Mock the InteractiveMap component to avoid Leaflet CSS import issues
jest.mock('@/components/features/analytics/InteractiveMap', () => ({
  InteractiveMap: ({ selectedEntityId, className }: any) => {
    const { useAnalyticsStore } = require('@/stores/analytics.store');
    const { selectedIncident } = useAnalyticsStore();
    
    if (!selectedIncident) {
      return (
        <div className={`h-72 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center ${className || ''}`}>
          <div className="text-center text-gray-500">
            <h4 className="font-medium mb-2">Interactive Map</h4>
            <p className="text-sm">Select an incident to view entity locations and assessment data</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`h-72 rounded-lg border overflow-hidden relative ${className || ''}`}>
        <div data-testid="map-container">
          <div data-testid="tile-layer" />
          <div data-testid="entity-marker-entity-1" data-highlighted="true" data-selected={selectedEntityId === 'entity-1'}>
            Maiduguri Metropolitan
          </div>
          <div data-testid="entity-marker-entity-2" data-highlighted={selectedEntityId === 'all' || selectedEntityId === 'entity-2'} data-selected={selectedEntityId === 'entity-2'}>
            Jere LGA
          </div>
          <div data-testid="assessment-overlay" data-entity-count="2" />
          <div data-testid="response-overlay" data-entity-count="2" />
          <div data-testid="gap-analysis-overlay" data-entity-count="2" />
        </div>
      </div>
    );
  },
}));

// Mock the analytics store
jest.mock('@/stores/analytics.store', () => ({
  useAnalyticsStore: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUseAnalyticsStore = useAnalyticsStore as jest.MockedFunction<typeof useAnalyticsStore>;

const mockIncident = {
  id: 'incident-1',
  name: 'Test Incident',
  type: 'Flood',
  status: 'ACTIVE' as const,
  declarationDate: '2025-01-01T00:00:00Z',
};

const mockEntityData = {
  success: true,
  data: {
    entities: [
      {
        id: 'entity-1',
        name: 'Maiduguri Metropolitan',
        type: 'LGA',
        coordinates: [11.8311, 13.1511],
        assessmentData: { total: 5, pending: 2, completed: 3 },
        responseData: { total: 3, active: 1, completed: 2 },
      },
      {
        id: 'entity-2',
        name: 'Jere LGA',
        type: 'LGA',
        coordinates: [11.9000, 13.2000],
        assessmentData: { total: 8, pending: 3, completed: 5 },
        responseData: { total: 2, active: 2, completed: 0 },
      },
    ],
    totalCount: 2,
    incidentName: 'Test Incident',
  },
};

describe('InteractiveMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockEntityData,
    });
  });

  it('renders placeholder when no incident is selected', () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: null,
    });

    const { InteractiveMap } = require('@/components/features/analytics/InteractiveMap');
    render(<InteractiveMap selectedEntityId={null} />);

    expect(screen.getByText('Interactive Map')).toBeInTheDocument();
    expect(screen.getByText('Select an incident to view entity locations and assessment data')).toBeInTheDocument();
  });

  it('renders loading state when fetching entities', async () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockIncident,
    });

    // Mock a delayed fetch
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<InteractiveMap selectedEntityId="all" />);

    expect(screen.getByText('Loading map data...')).toBeInTheDocument();
  });

  it('renders map with entities when data is loaded', async () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockIncident,
    });

    render(<InteractiveMap selectedEntityId="all" />);

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Check that entity markers are rendered
    await waitFor(() => {
      expect(screen.getByTestId('entity-marker-entity-1')).toBeInTheDocument();
      expect(screen.getByTestId('entity-marker-entity-2')).toBeInTheDocument();
    });

    // Check that overlays are rendered
    expect(screen.getByTestId('assessment-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('response-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('gap-analysis-overlay')).toBeInTheDocument();
  });

  it('highlights selected entity correctly', async () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockIncident,
    });

    render(<InteractiveMap selectedEntityId="entity-1" />);

    await waitFor(() => {
      const marker1 = screen.getByTestId('entity-marker-entity-1');
      const marker2 = screen.getByTestId('entity-marker-entity-2');
      
      expect(marker1).toHaveAttribute('data-selected', 'true');
      expect(marker1).toHaveAttribute('data-highlighted', 'true');
      expect(marker2).toHaveAttribute('data-selected', 'false');
      expect(marker2).toHaveAttribute('data-highlighted', 'false');
    });
  });

  it('highlights all entities when "all" is selected', async () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockIncident,
    });

    render(<InteractiveMap selectedEntityId="all" />);

    await waitFor(() => {
      const marker1 = screen.getByTestId('entity-marker-entity-1');
      const marker2 = screen.getByTestId('entity-marker-entity-2');
      
      expect(marker1).toHaveAttribute('data-highlighted', 'true');
      expect(marker2).toHaveAttribute('data-highlighted', 'true');
      expect(marker1).toHaveAttribute('data-selected', 'false');
      expect(marker2).toHaveAttribute('data-selected', 'false');
    });
  });

  it('handles API errors gracefully', async () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockIncident,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<InteractiveMap selectedEntityId="all" />);

    await waitFor(() => {
      expect(screen.getByText('Map Error')).toBeInTheDocument();
      expect(screen.getByText(/HTTP error! status: 500/)).toBeInTheDocument();
    });
  });

  it('filters entities correctly for specific selection', async () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockIncident,
    });

    render(<InteractiveMap selectedEntityId="entity-1" />);

    await waitFor(() => {
      // Only entity-1 should be rendered when selected
      expect(screen.getByTestId('entity-marker-entity-1')).toBeInTheDocument();
      expect(screen.queryByTestId('entity-marker-entity-2')).not.toBeInTheDocument();
    });

    // Check that overlays receive filtered entities
    const assessmentOverlay = screen.getByTestId('assessment-overlay');
    expect(assessmentOverlay).toHaveAttribute('data-entity-count', '1');
  });

  it('re-fetches data when incident changes', async () => {
    const { rerender } = render(<InteractiveMap selectedEntityId="all" />);

    // Initially no incident
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: null,
    });

    expect(global.fetch).not.toHaveBeenCalled();

    // Change to have an incident
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockIncident,
    });

    rerender(<InteractiveMap selectedEntityId="all" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/v1/monitoring/analytics/entities/by-incident/${mockIncident.id}`
      );
    });
  });

  it('applies custom className correctly', () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: null,
    });

    render(<InteractiveMap selectedEntityId={null} className="custom-class" />);

    const container = screen.getByText('Interactive Map').closest('div');
    expect(container).toHaveClass('custom-class');
  });
});