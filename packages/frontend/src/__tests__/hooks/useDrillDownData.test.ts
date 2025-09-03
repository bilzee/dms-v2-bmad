import { renderHook, waitFor, act } from '@testing-library/react';
import { useDrillDownData } from '@/hooks/useDrillDownData';

global.fetch = jest.fn();

const mockApiResponse = {
  success: true,
  data: [
    {
      id: 'TEST-001',
      type: 'SHELTER',
      date: '2025-08-31T10:00:00Z',
      assessorName: 'John Smith',
      verificationStatus: 'VERIFIED',
      entityName: 'Camp Alpha',
      entityType: 'CAMP',
      coordinates: { latitude: 12.3456, longitude: 14.7890 },
      dataDetails: { shelterCount: 15 },
      mediaCount: 3,
      syncStatus: 'SYNCED'
    }
  ],
  meta: {
    totalRecords: 1,
    totalPages: 1,
    currentPage: 1,
    aggregations: {
      byType: { SHELTER: 1 },
      byStatus: { VERIFIED: 1 }
    }
  }
};

describe('useDrillDownData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('fetches data on mount', async () => {
    const { result } = renderHook(() => 
      useDrillDownData('assessments', {})
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe('TEST-001');
  });

  it('handles filters correctly', async () => {
    const filters = {
      incidentIds: ['INC-001'],
      entityIds: ['ENT-001']
    };

    renderHook(() => 
      useDrillDownData('assessments', filters)
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('incidentIds=INC-001')
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('entityIds=ENT-001')
    );
  });

  it('updates data when filters change', async () => {
    const { result, rerender } = renderHook(
      ({ filters }) => useDrillDownData('assessments', filters),
      { initialProps: { filters: {} } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    // Update filters
    rerender({ filters: { incidentIds: ['INC-001'] } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('handles pagination correctly', async () => {
    const { result } = renderHook(() => 
      useDrillDownData('assessments', {})
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.pagination.totalPages).toBe(1);
    expect(result.current.pagination.totalRecords).toBe(1);

    // Test page change
    await act(async () => {
      result.current.pagination.setCurrentPage(2);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
    });
  });

  it('provides refresh functionality', async () => {
    const { result } = renderHook(() => 
      useDrillDownData('assessments', {})
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => 
      useDrillDownData('assessments', {})
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toHaveLength(0);
  });

  it('transforms date strings to Date objects', async () => {
    const { result } = renderHook(() => 
      useDrillDownData('assessments', {})
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data[0].date).toBeInstanceOf(Date);
  });

  it('provides aggregations data', async () => {
    const { result } = renderHook(() => 
      useDrillDownData('assessments', {})
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.aggregations).toHaveProperty('byType');
    expect(result.current.aggregations).toHaveProperty('byStatus');
    expect(result.current.aggregations.byType.SHELTER).toBe(1);
    expect(result.current.aggregations.byStatus.VERIFIED).toBe(1);
  });

  it('handles different data types correctly', async () => {
    const { rerender } = renderHook(
      ({ dataType }) => useDrillDownData(dataType, {}),
      { initialProps: { dataType: 'assessments' as const } }
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/monitoring/drill-down/assessments')
      );
    });

    rerender({ dataType: 'responses' as const });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/monitoring/drill-down/responses')
      );
    });
  });

  it('debounces rapid filter changes', async () => {
    const { result, rerender } = renderHook(
      ({ filters }) => useDrillDownData('assessments', filters),
      { initialProps: { filters: {} } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Rapid filter changes
    rerender({ filters: { incidentIds: ['INC-001'] } });
    rerender({ filters: { incidentIds: ['INC-002'] } });
    rerender({ filters: { incidentIds: ['INC-003'] } });

    // Should not make excessive API calls
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial + final
    });
  });
});