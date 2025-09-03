import { renderHook, waitFor, act } from '@testing-library/react';
import { useMapData } from '@/hooks/useMapData';

// Mock fetch globally
global.fetch = jest.fn();

const mockEntitiesResponse = {
  success: true,
  data: [
    {
      id: 'entity-1',
      name: 'Test Camp',
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
};

const mockAssessmentsResponse = {
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
      entityName: 'Test Camp',
      verificationStatus: 'VERIFIED',
      priorityLevel: 'HIGH',
    },
  ],
};

const mockResponsesResponse = {
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
      entityName: 'Test Camp',
      status: 'DELIVERED',
      deliveryItems: [{ item: 'Food Rations', quantity: 100 }],
    },
  ],
};

describe('useMapData hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/entities')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockEntitiesResponse,
          });
        }
        if (url.includes('/assessments')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAssessmentsResponse,
          });
        }
        if (url.includes('/responses')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockResponsesResponse,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useMapData({ autoRefresh: false }));
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.entities).toEqual([]);
    expect(result.current.assessments).toEqual([]);
    expect(result.current.responses).toEqual([]);
  });

  it('fetches all map data successfully', async () => {
    const { result } = renderHook(() => useMapData({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entities).toHaveLength(1);
    expect(result.current.assessments).toHaveLength(1);
    expect(result.current.responses).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('calculates map bounds correctly', async () => {
    const { result } = renderHook(() => useMapData({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { center, bounds } = result.current.getMapBounds();
    
    expect(center.lat).toBe(12.5);
    expect(center.lng).toBe(14.5);
    expect(bounds.northEast.lat).toBe(12.5);
    expect(bounds.southWest.lat).toBe(12.5);
  });

  it('generates data summary correctly', async () => {
    const { result } = renderHook(() => useMapData({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const summary = result.current.getDataSummary();
    
    expect(summary.totalEntities).toBe(1);
    expect(summary.totalAssessments).toBe(1);
    expect(summary.totalResponses).toBe(1);
    expect(summary.verifiedAssessments).toBe(1);
    expect(summary.completedResponses).toBe(1);
    expect(summary.totalDeliveryItems).toBe(100);
  });

  it('handles refresh functionality', async () => {
    const { result } = renderHook(() => useMapData({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(3); // Initial load for all 3 endpoints

    await act(async () => {
      await result.current.refreshMapData();
    });

    expect(fetch).toHaveBeenCalledTimes(6); // Another 3 calls for refresh
  });

  it('handles fetch errors appropriately', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useMapData({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.connectionStatus).toBe('offline');
  });

  it('handles auto-refresh with specified interval', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => 
      useMapData({ autoRefresh: true, refreshInterval: 1000 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(3); // Initial load

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(6); // Refresh after interval
    });

    jest.useRealTimers();
  });
});