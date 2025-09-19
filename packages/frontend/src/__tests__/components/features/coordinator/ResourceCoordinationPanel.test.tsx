import { render, screen, waitFor } from '@testing-library/react';
import { ResourceCoordinationPanel } from '@/components/features/coordinator/ResourceCoordinationPanel';
import { useDashboardBadges } from '@/hooks/useDashboardBadges';

// Mock the hooks
jest.mock('@/hooks/useDashboardBadges');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockUseDashboardBadges = useDashboardBadges as jest.MockedFunction<typeof useDashboardBadges>;

describe('ResourceCoordinationPanel', () => {
  const mockBadgesData = {
    assessmentQueue: 15,
    responseQueue: 8,
    assessmentReviews: 5,
    incidentManagement: 2,
    activeIncidents: 2,
    totalLocations: 9,
    activeUsers: 8
  };

  beforeEach(() => {
    mockUseDashboardBadges.mockReturnValue({
      badges: mockBadgesData,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders resource coordination panel with correct structure', () => {
    render(<ResourceCoordinationPanel />);

    expect(screen.getByText('Resource Coordination')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('WASH')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Shelter')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('displays loading state when fetching data', () => {
    mockUseDashboardBadges.mockReturnValue({
      badges: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<ResourceCoordinationPanel />);

    expect(screen.getByText('Loading resource coordination data...')).toBeInTheDocument();
  });

  it('displays error state when API fails', () => {
    mockUseDashboardBadges.mockReturnValue({
      badges: null,
      loading: false,
      error: 'Failed to fetch resource data',
      refetch: jest.fn(),
    });

    render(<ResourceCoordinationPanel />);

    expect(screen.getByText('Error: Failed to fetch resource data')).toBeInTheDocument();
  });

  it('shows empty state when no resource data available', async () => {
    // Mock empty API response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { resources: [] }
      })
    });

    render(<ResourceCoordinationPanel />);

    await waitFor(() => {
      expect(screen.getByText(/No resource data available/)).toBeInTheDocument();
    });
  });

  it('displays resource data correctly when available', async () => {
    const mockResourceData = {
      success: true,
      data: {
        resources: [
          {
            responseType: 'FOOD',
            totalCommitted: 1000,
            totalAllocated: 750,
            totalAvailable: 250,
            unit: 'kg',
            commitments: [
              {
                donorName: 'Test Donor 1',
                quantity: 500,
                targetDate: new Date(),
                status: 'DELIVERED'
              }
            ],
            allocations: [
              {
                affectedEntityName: 'Test Community',
                quantity: 250,
                priority: 'HIGH',
                targetDate: new Date()
              }
            ],
            projectedShortfall: 0,
            earliestAvailable: new Date(),
            lastUpdated: new Date()
          }
        ]
      }
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResourceData)
    });

    render(<ResourceCoordinationPanel />);

    await waitFor(() => {
      expect(screen.getByText('1000')).toBeInTheDocument(); // Committed
      expect(screen.getByText('750')).toBeInTheDocument();  // Allocated
      expect(screen.getByText('250')).toBeInTheDocument();  // Available
      expect(screen.getByText('Test Donor 1')).toBeInTheDocument();
      expect(screen.getByText('Test Community')).toBeInTheDocument();
    });
  });

  it('handles resource filtering by type', async () => {
    const mockResourceData = {
      success: true,
      data: {
        resources: [
          {
            responseType: 'FOOD',
            totalCommitted: 1000,
            totalAllocated: 750,
            totalAvailable: 250,
            unit: 'kg',
            commitments: [],
            allocations: [],
            projectedShortfall: 0,
            earliestAvailable: new Date(),
            lastUpdated: new Date()
          },
          {
            responseType: 'WASH',
            totalCommitted: 500,
            totalAllocated: 300,
            totalAvailable: 200,
            unit: 'units',
            commitments: [],
            allocations: [],
            projectedShortfall: 0,
            earliestAvailable: new Date(),
            lastUpdated: new Date()
          }
        ]
      }
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResourceData)
    });

    render(<ResourceCoordinationPanel />);

    await waitFor(() => {
      expect(screen.getByText('1000')).toBeInTheDocument(); // FOOD resources
      expect(screen.getByText('500')).toBeInTheDocument();  // WASH resources
    });

    // Test filtering by FOOD type
    const foodTab = screen.getByText('Food');
    foodTab.click();

    await waitFor(() => {
      expect(screen.getByText('1000')).toBeInTheDocument(); // Still shows FOOD
      expect(screen.queryByText('500')).not.toBeInTheDocument(); // WASH hidden
    });
  });

  it('displays shortfall alerts when resources are insufficient', async () => {
    const mockResourceData = {
      success: true,
      data: {
        resources: [
          {
            responseType: 'FOOD',
            totalCommitted: 500,
            totalAllocated: 750,
            totalAvailable: -250,
            unit: 'kg',
            commitments: [],
            allocations: [],
            projectedShortfall: 250,
            earliestAvailable: new Date(),
            lastUpdated: new Date()
          }
        ]
      }
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResourceData)
    });

    render(<ResourceCoordinationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Shortfall')).toBeInTheDocument();
      expect(screen.getByText('Projected Shortfall: 250 kg')).toBeInTheDocument();
    });
  });

  it('calls refresh function when refresh button is clicked', async () => {
    const mockResourceData = {
      success: true,
      data: { resources: [] }
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResourceData)
    });

    global.fetch = mockFetch;

    render(<ResourceCoordinationPanel />);

    const refreshButton = screen.getByText('Refresh');
    refreshButton.click();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/coordinator/resources/available')
    );
  });
});