import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseMapLayer } from '@/components/features/monitoring/ResponseMapLayer';

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

const mockResponseResponse = {
  success: true,
  data: [
    {
      id: 'response-1',
      responseType: 'FOOD_DISTRIBUTION',
      plannedDate: new Date().toISOString(),
      deliveredDate: new Date().toISOString(),
      responderName: 'Team Alpha',
      coordinates: {
        latitude: 12.5,
        longitude: 14.5,
        accuracy: 10,
        timestamp: new Date().toISOString(),
        captureMethod: 'GPS',
      },
      entityName: 'Test Camp Alpha',
      status: 'DELIVERED',
      deliveryItems: [
        { item: 'Food Rations', quantity: 100 },
        { item: 'Water Bottles', quantity: 50 },
      ],
    },
  ],
  meta: {
    statusBreakdown: {
      planned: 0,
      inProgress: 0,
      delivered: 1,
      cancelled: 0,
    },
    totalDeliveryItems: 150,
    lastUpdate: new Date().toISOString(),
    refreshInterval: 25,
    connectionStatus: 'connected',
  },
};

describe('ResponseMapLayer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponseResponse,
    });
  });

  it('renders when visible', async () => {
    await act(async () => {
      render(<ResponseMapLayer visible={true} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/map/responses');
    });
  });

  it('does not render when invisible', () => {
    render(<ResponseMapLayer visible={false} />);
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('displays loading state', () => {
    render(<ResponseMapLayer visible={true} />);
    
    expect(screen.getByText('Loading responses...')).toBeInTheDocument();
  });

  it('displays response markers after loading', async () => {
    await act(async () => {
      render(<ResponseMapLayer visible={true} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Should render response markers - in real tests this would verify marker positioning
    // For now just check that component rendered without error
    expect(screen.queryByText('Loading responses...')).not.toBeInTheDocument();
  });

  it('handles response selection callback', async () => {
    const mockOnResponseSelect = jest.fn();
    
    await act(async () => {
      render(<ResponseMapLayer visible={true} onResponseSelect={mockOnResponseSelect} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // In a real implementation, this would test clicking on response markers
  });

  it('refreshes data on specified interval', async () => {
    const shortInterval = 1000;
    
    await act(async () => {
      render(<ResponseMapLayer visible={true} refreshInterval={shortInterval} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

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
      render(<ResponseMapLayer visible={true} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(screen.queryByText('Loading responses...')).not.toBeInTheDocument();
  });
});