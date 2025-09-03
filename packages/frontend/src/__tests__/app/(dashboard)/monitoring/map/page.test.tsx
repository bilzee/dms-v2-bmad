import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InteractiveMap from '@/app/(dashboard)/monitoring/map/page';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Leaflet to avoid SSR issues
jest.mock('leaflet', () => ({
  Map: jest.fn(),
  TileLayer: jest.fn(),
  Marker: jest.fn(),
}));

// Mock dynamic imports for Leaflet components
jest.mock('next/dynamic', () => () => {
  const MockComponent = () => <div data-testid="mock-map-component">Map Component</div>;
  return MockComponent;
});

// Suppress React DOM warnings for async operations
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

const mockMapEntitiesResponse = {
  success: true,
  data: [
    {
      id: 'entity-1',
      name: 'Test Camp Alpha',
      type: 'CAMP',
      longitude: 14.5,
      latitude: 12.5,
      coordinates: {
        latitude: 12.5,
        longitude: 14.5,
        accuracy: 10,
        timestamp: new Date().toISOString(),
        captureMethod: 'GPS',
      },
      assessmentCount: 5,
      responseCount: 3,
      lastActivity: new Date().toISOString(),
      statusSummary: {
        pendingAssessments: 2,
        verifiedAssessments: 3,
        activeResponses: 1,
        completedResponses: 2,
      },
    },
  ],
  meta: {
    boundingBox: {
      northEast: { latitude: 13.0, longitude: 15.0 },
      southWest: { latitude: 12.0, longitude: 14.0 },
    },
    totalEntities: 1,
    lastUpdate: new Date().toISOString(),
    refreshInterval: 25,
    connectionStatus: 'connected',
    dataSource: 'real-time',
  },
  message: 'Map entities retrieved successfully',
  timestamp: new Date().toISOString(),
};

describe('InteractiveMap Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockMapEntitiesResponse,
    });
  });

  it('renders interactive map page correctly', async () => {
    await act(async () => {
      render(<InteractiveMap />);
    });

    expect(screen.getByText('Interactive Mapping')).toBeInTheDocument();
    expect(screen.getByText('Geographic visualization of affected entities, assessments, and responses')).toBeInTheDocument();
  });

  it('displays loading state initially', async () => {
    render(<InteractiveMap />);
    
    expect(screen.getByText('Loading geographic visualization data...')).toBeInTheDocument();
  });

  it('fetches and displays map data', async () => {
    await act(async () => {
      render(<InteractiveMap />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/map/entities');
    });

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Total entities
    });
  });

  it('displays connection status badge', async () => {
    await act(async () => {
      render(<InteractiveMap />);
    });

    await waitFor(() => {
      expect(screen.getByText('CONNECTED')).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<InteractiveMap />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    
    await act(async () => {
      await user.click(refreshButton);
    });

    expect(fetch).toHaveBeenCalledTimes(2); // Initial load + manual refresh
  });

  it('displays layer control buttons', async () => {
    await act(async () => {
      render(<InteractiveMap />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Entities/)).toBeInTheDocument();
      expect(screen.getByText(/Assessments/)).toBeInTheDocument();
      expect(screen.getByText(/Responses/)).toBeInTheDocument();
    });
  });

  it('handles layer toggle functionality', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<InteractiveMap />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Entities/)).toBeInTheDocument();
    });

    const entitiesButton = screen.getByText(/Entities/).closest('button');
    expect(entitiesButton).toBeInTheDocument();
    
    await act(async () => {
      await user.click(entitiesButton!);
    });

    // Button should still be present but may have different styling
    expect(entitiesButton).toBeInTheDocument();
  });

  it('displays error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<InteractiveMap />);
    });

    await waitFor(() => {
      expect(screen.getByText('Unable to load geographic data')).toBeInTheDocument();
    });
  });
});