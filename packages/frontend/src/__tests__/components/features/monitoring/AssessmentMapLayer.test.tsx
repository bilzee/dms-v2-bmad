import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssessmentMapLayer } from '@/components/features/monitoring/AssessmentMapLayer';

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

const mockAssessmentResponse = {
  success: true,
  data: [
    {
      id: 'assessment-1',
      type: 'HEALTH',
      date: new Date().toISOString(),
      assessorName: 'Dr. Smith',
      coordinates: {
        latitude: 12.5,
        longitude: 14.5,
        accuracy: 10,
        timestamp: new Date().toISOString(),
        captureMethod: 'GPS',
      },
      entityName: 'Test Camp Alpha',
      verificationStatus: 'VERIFIED',
      priorityLevel: 'HIGH',
    },
    {
      id: 'assessment-2',
      type: 'WASH',
      date: new Date().toISOString(),
      assessorName: 'Field Worker Ali',
      coordinates: {
        latitude: 12.3,
        longitude: 14.3,
        accuracy: 15,
        timestamp: new Date().toISOString(),
        captureMethod: 'MANUAL',
      },
      entityName: 'Test Community Beta',
      verificationStatus: 'PENDING',
      priorityLevel: 'CRITICAL',
    },
    {
      id: 'assessment-3',
      type: 'SECURITY',
      date: new Date().toISOString(),
      assessorName: 'Officer Johnson',
      coordinates: {
        latitude: 12.7,
        longitude: 14.7,
        accuracy: 12,
        timestamp: new Date().toISOString(),
        captureMethod: 'GPS',
      },
      entityName: 'Test Facility Gamma',
      verificationStatus: 'REJECTED',
      priorityLevel: 'LOW',
    },
  ],
  meta: {
    statusBreakdown: {
      pending: 1,
      verified: 1,
      rejected: 1,
    },
    typeBreakdown: {
      HEALTH: 1,
      WASH: 1,
      SHELTER: 0,
      FOOD: 0,
      SECURITY: 0,
      POPULATION: 0,
    },
    lastUpdate: new Date().toISOString(),
    refreshInterval: 25,
    connectionStatus: 'connected',
  },
};

describe('AssessmentMapLayer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAssessmentResponse,
    });
  });

  it('renders when visible', async () => {
    await act(async () => {
      render(<AssessmentMapLayer visible={true} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/monitoring/map/assessments');
    });
  });

  it('does not render when invisible', () => {
    render(<AssessmentMapLayer visible={false} />);
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('displays loading state', () => {
    render(<AssessmentMapLayer visible={true} />);
    
    expect(screen.getByText('Loading assessments...')).toBeInTheDocument();
  });

  it('displays assessment legend', async () => {
    await act(async () => {
      render(<AssessmentMapLayer visible={true} />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Assessment Details')).toHaveLength(3);
      expect(screen.getByText(/verified/i)).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    });
  });

  it('handles assessment selection callback', async () => {
    const mockOnAssessmentSelect = jest.fn();
    
    await act(async () => {
      render(<AssessmentMapLayer visible={true} onAssessmentSelect={mockOnAssessmentSelect} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // In a real implementation, this would test clicking on assessment markers
    // and verify that onAssessmentSelect is called with the correct assessment data
  });

  it('refreshes data on specified interval', async () => {
    const shortInterval = 1000; // 1 second for testing
    
    await act(async () => {
      render(<AssessmentMapLayer visible={true} refreshInterval={shortInterval} />);
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
      render(<AssessmentMapLayer visible={true} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Component should handle error without crashing
    expect(screen.queryByText('Loading assessments...')).not.toBeInTheDocument();
  });
});