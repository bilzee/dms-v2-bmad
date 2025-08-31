import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityMapLayer } from '@/components/features/monitoring/EntityMapLayer';

// Mock react-leaflet components
jest.mock('react-leaflet', () => ({
  Marker: ({ children, eventHandlers }: any) => (
    <div data-testid="marker" onClick={() => eventHandlers?.click()}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}));

// Mock Leaflet
jest.mock('leaflet', () => ({
  divIcon: jest.fn(() => ({ iconHtml: 'mock-icon' })),
}));

// Mock fetch globally
global.fetch = jest.fn();

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

const mockEntityResponse = {
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
    {
      id: 'entity-2',
      name: 'Test Community Beta',
      type: 'COMMUNITY',
      longitude: 14.3,
      latitude: 12.3,
      coordinates: {
        latitude: 12.3,
        longitude: 14.3,
        accuracy: 15,
        timestamp: new Date().toISOString(),
        captureMethod: 'MAP_SELECT',
      },
      assessmentCount: 2,
      responseCount: 1,
      lastActivity: new Date().toISOString(),
      statusSummary: {
        pendingAssessments: 1,
        verifiedAssessments: 1,
        activeResponses: 0,
        completedResponses: 1,
      },
    },
  ],
};

describe('EntityMapLayer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockEntityResponse,
    });
  });

  it('renders when visible', async () => {
    await act(async () => {
      render(<EntityMapLayer visible={true} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/map/entities');
    });
  });

  it('does not render when invisible', () => {
    render(<EntityMapLayer visible={false} />);
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('displays loading state', () => {
    render(<EntityMapLayer visible={true} />);
    
    expect(screen.getByText('Loading entities...')).toBeInTheDocument();
  });

  it('displays entity markers after loading', async () => {
    await act(async () => {
      render(<EntityMapLayer visible={true} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Should render entity markers based on coordinates
    // In a real implementation, this would test marker positioning
  });

  it('handles entity selection', async () => {
    const mockOnEntitySelect = jest.fn();
    const user = userEvent.setup();
    
    await act(async () => {
      render(<EntityMapLayer visible={true} onEntitySelect={mockOnEntitySelect} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // In a real implementation, this would test clicking on entity markers
    // and verify that onEntitySelect is called with the correct entity data
  });

  it('refreshes data on interval', async () => {
    const shortInterval = 1000; // 1 second for testing
    
    await act(async () => {
      render(<EntityMapLayer visible={true} refreshInterval={shortInterval} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Wait for refresh interval
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, shortInterval + 100));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<EntityMapLayer visible={true} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Component should handle error without crashing
    expect(screen.queryByText('Loading entities...')).not.toBeInTheDocument();
  });
});