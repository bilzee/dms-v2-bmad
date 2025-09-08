import { renderHook, act, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useDonorCoordination } from '@/hooks/useDonorCoordination';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

const mockDonorsResponse = {
  success: true,
  data: {
    donors: [
      {
        id: '1',
        name: 'ActionAid Nigeria',
        organization: 'ActionAid Nigeria',
        email: 'coordinator@actionaid.org.ng',
        phone: '+234-812-345-6789',
        performanceScore: 95,
        commitments: [],
        achievements: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-08-20'),
      }
    ],
    stats: {
      totalDonors: 5,
      activeDonors: 3,
      totalCommitments: 6,
      pendingCommitments: 4,
      byResourceType: {
        FOOD: 2,
        WASH: 2,
        HEALTH: 1,
        SHELTER: 1,
        SECURITY: 0,
        POPULATION: 0,
      }
    }
  },
  message: 'Found 1 donors',
  timestamp: new Date().toISOString(),
};

const mockResourcesResponse = {
  success: true,
  data: {
    resources: [
      {
        responseType: 'FOOD',
        totalCommitted: 1200,
        totalAllocated: 800,
        totalAvailable: 400,
        unit: 'kg',
        commitments: [],
        allocations: [],
        projectedShortfall: 0,
        earliestAvailable: new Date('2024-09-12'),
        lastUpdated: new Date('2024-08-25'),
      }
    ],
    summary: {
      totalResourceTypes: 4,
      resourcesWithShortfalls: 2,
      resourcesFullyAllocated: 1,
      totalCommitments: 5,
      totalAllocations: 3,
      criticalShortfalls: [],
      upcomingDeadlines: []
    }
  },
  message: 'Found 4 resource types with availability data',
  timestamp: new Date().toISOString(),
};

const mockAllocationResponse = {
  success: true,
  data: {
    allocation: {
      id: 'alloc-1',
      responseType: 'FOOD',
      quantity: 300,
      unit: 'kg',
      affectedEntityId: 'entity-1',
      affectedEntityName: 'Maiduguri IDP Camp',
      priority: 'HIGH',
      targetDate: new Date('2024-09-10'),
      status: 'PENDING',
      coordinatorId: 'current-coordinator',
      coordinatorName: 'Current Coordinator',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    donorSuggestions: [],
    conflicts: [],
    workspaceEntries: []
  },
  message: 'Resource allocation created successfully',
  timestamp: new Date().toISOString(),
};

describe('useDonorCoordination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useDonorCoordination());

    expect(result.current.donors).toEqual([]);
    expect(result.current.resourceAvailability).toBeNull();
    expect(result.current.coordinationWorkspace).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches data successfully on refreshData call', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonorsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResourcesResponse,
      });

    const { result } = renderHook(() => useDonorCoordination());

    await act(async () => {
      await result.current.refreshData();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.donors).toHaveLength(1);
      expect(result.current.donors[0].name).toBe('ActionAid Nigeria');
      expect(result.current.resourceAvailability?.resources).toHaveLength(1);
      expect(result.current.stats?.totalDonors).toBe(5);
      expect(result.current.error).toBeNull();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith('/api/v1/donors');
    expect(fetch).toHaveBeenCalledWith('/api/v1/coordinator/resources/available');
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useDonorCoordination());

    await act(async () => {
      await result.current.refreshData();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(result.current.donors).toEqual([]);
    });
  });

  it('handles API error responses', async () => {
    const errorResponse = {
      success: false,
      message: 'Failed to fetch donors',
      timestamp: new Date().toISOString(),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => errorResponse,
    });

    const { result } = renderHook(() => useDonorCoordination());

    await act(async () => {
      await result.current.refreshData();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch donors');
    });
  });

  it('updates donor successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonorsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResourcesResponse,
      });

    const { result } = renderHook(() => useDonorCoordination());

    // First refresh to get initial data
    await act(async () => {
      await result.current.refreshData();
    });

    // Update donor
    await act(async () => {
      await result.current.updateDonor('1', { performanceScore: 90 });
    });

    await waitFor(() => {
      expect(result.current.donors[0].performanceScore).toBe(90);
      expect(result.current.donors[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  it('creates allocation successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonorsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResourcesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAllocationResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonorsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResourcesResponse,
      });

    const { result } = renderHook(() => useDonorCoordination());

    // First refresh to get initial data
    await act(async () => {
      await result.current.refreshData();
    });

    const allocationRequest = {
      responseType: 'FOOD' as const,
      quantity: 300,
      unit: 'kg',
      affectedEntityId: 'entity-1',
      affectedEntityName: 'Maiduguri IDP Camp',
      priority: 'HIGH' as const,
    };

    let result_data: any;
    await act(async () => {
      result_data = await result.current.createAllocation(allocationRequest);
    });

    await waitFor(() => {
      expect(result_data).toEqual({ success: true, data: mockAllocationResponse.data });
      expect(fetch).toHaveBeenCalledWith('/api/v1/coordinator/resources/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationRequest),
      });
    });
  });

  it('handles allocation conflicts', async () => {
    const conflictResponse = {
      success: false,
      error: 'Allocation conflicts detected',
      conflicts: [
        {
          type: 'QUANTITY_SHORTAGE',
          description: 'Requested quantity exceeds available resources',
          severity: 'HIGH',
          suggestion: 'Reduce quantity or secure additional commitments'
        }
      ],
      message: 'Please review conflicts and resubmit with overrideConflicts=true if needed',
      timestamp: new Date().toISOString(),
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonorsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResourcesResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => conflictResponse,
      });

    const { result } = renderHook(() => useDonorCoordination());

    // First refresh to get initial data
    await act(async () => {
      await result.current.refreshData();
    });

    const allocationRequest = {
      responseType: 'FOOD' as const,
      quantity: 1500, // More than available
      unit: 'kg',
      affectedEntityId: 'entity-1',
      priority: 'HIGH' as const,
    };

    let result_data: any;
    await act(async () => {
      result_data = await result.current.createAllocation(allocationRequest);
    });

    await waitFor(() => {
      expect(result_data).toEqual({ 
        success: false, 
        conflicts: conflictResponse.conflicts 
      });
      expect(result.current.error).toContain('Allocation conflicts detected');
    });
  });

  it('resolves conflicts successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonorsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResourcesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDonorsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResourcesResponse,
      });

    const { result } = renderHook(() => useDonorCoordination());

    // First refresh to get initial data
    await act(async () => {
      await result.current.refreshData();
    });

    const resolution = {
      resolvedAt: new Date(),
      resolution: 'Staggered delivery times to avoid conflict',
      resolvedBy: 'current-coordinator',
    };

    await act(async () => {
      await result.current.resolveConflict('ws-1', resolution);
    });

    await waitFor(() => {
      // Should have called refreshData again
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });

  it('sets loading state during async operations', async () => {
    // Mock slow response
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => mockDonorsResponse,
        }), 100)
      )
    );

    const { result } = renderHook(() => useDonorCoordination());

    act(() => {
      result.current.refreshData();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});