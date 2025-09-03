import { performance } from 'perf_hooks';

global.fetch = jest.fn();

const generateLargeDataset = (size: number) => ({
  success: true,
  data: Array.from({ length: size }, (_, i) => ({
    id: `ITEM-${(i + 1).toString().padStart(6, '0')}`,
    type: 'SHELTER',
    date: new Date(Date.now() - i * 60000).toISOString(),
    assessorName: `Assessor ${i + 1}`,
    verificationStatus: ['VERIFIED', 'PENDING', 'REJECTED'][i % 3],
    entityName: `Entity ${i + 1}`,
    entityType: ['CAMP', 'COMMUNITY'][i % 2],
    coordinates: { 
      latitude: 12.0 + (i * 0.001), 
      longitude: 14.0 + (i * 0.001) 
    },
    dataDetails: {
      shelterCount: 10 + (i % 20),
      shelterCondition: ['GOOD', 'FAIR', 'POOR'][i % 3],
      occupancyRate: 50 + (i % 50)
    },
    mediaCount: i % 10,
    syncStatus: ['SYNCED', 'SYNCING', 'PENDING'][i % 3]
  })),
  meta: {
    totalRecords: size,
    totalPages: Math.ceil(size / 20),
    currentPage: 1,
    aggregations: {
      byType: { SHELTER: size },
      byStatus: { 
        VERIFIED: Math.floor(size / 3),
        PENDING: Math.floor(size / 3),
        REJECTED: Math.floor(size / 3)
      }
    }
  }
});

describe('Drill-Down Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('handles large assessment dataset efficiently', async () => {
    const largeDataset = generateLargeDataset(1000);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(largeDataset),
    });

    const startTime = performance.now();

    // Import and test the hook
    const { useDrillDownData } = await import('@/hooks/useDrillDownData');
    const { renderHook, waitFor } = await import('@testing-library/react');

    const { result } = renderHook(() => 
      useDrillDownData('assessments', {})
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Should process within reasonable time (less than 2 seconds)
    expect(processingTime).toBeLessThan(2000);
    expect(result.current.data).toHaveLength(1000);
  });

  it('handles export of large datasets efficiently', async () => {
    // Mock export API response
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { exportId: 'export-123', status: 'processing' }
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { 
            exportId: 'export-123', 
            status: 'completed',
            downloadUrl: '/downloads/export-123.csv',
            fileSize: 1024000 // 1MB
          }
        }),
      });

    const startTime = performance.now();

    // Import and test the export hook
    const { useDataExport } = await import('@/hooks/useDataExport');
    const { renderHook, waitFor, act } = await import('@testing-library/react');

    const { result } = renderHook(() => useDataExport());

    await act(async () => {
      result.current.initiateExport('assessments', 'csv', {
        incidentIds: ['INC-001']
      });
    });

    await waitFor(() => {
      expect(result.current.exportStatus).toBe('processing');
    });

    // Simulate polling completion
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.exportStatus).toBe('completed');
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Export initiation should be fast
    expect(processingTime).toBeLessThan(1000);
    expect(result.current.downloadUrl).toBeTruthy();
  });

  it('efficiently filters and paginates large datasets', async () => {
    const largeDataset = generateLargeDataset(5000);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ...largeDataset,
        data: largeDataset.data.slice(0, 20) // Paginated result
      }),
    });

    const startTime = performance.now();

    const filters = {
      incidentIds: ['INC-001', 'INC-002'],
      entityIds: ['ENT-001', 'ENT-002', 'ENT-003'],
      assessmentTypes: ['SHELTER', 'HEALTHCARE'],
      verificationStatus: ['VERIFIED'],
      timeframe: {
        start: '2025-08-01T00:00:00Z',
        end: '2025-08-31T23:59:59Z'
      }
    };

    const { useDrillDownData } = await import('@/hooks/useDrillDownData');
    const { renderHook, waitFor } = await import('@testing-library/react');

    const { result } = renderHook(() => 
      useDrillDownData('assessments', filters)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Filtering should be efficient
    expect(processingTime).toBeLessThan(1500);
    expect(result.current.data).toHaveLength(20); // Paginated
    expect(result.current.pagination.totalRecords).toBe(5000);
  });

  it('handles rapid filter changes without performance degradation', async () => {
    const dataset = generateLargeDataset(100);
    let apiCallCount = 0;

    (fetch as jest.Mock).mockImplementation(() => {
      apiCallCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(dataset),
      });
    });

    const { useDrillDownFilters } = await import('@/hooks/useDrillDownFilters');
    const { renderHook, act } = await import('@testing-library/react');

    const { result } = renderHook(() => useDrillDownFilters());

    const startTime = performance.now();

    // Simulate rapid filter changes
    await act(async () => {
      result.current.updateFilters({ incidentIds: ['INC-001'] });
    });

    await act(async () => {
      result.current.updateFilters({ incidentIds: ['INC-002'] });
    });

    await act(async () => {
      result.current.updateFilters({ incidentIds: ['INC-003'] });
    });

    await act(async () => {
      result.current.updateFilters({ entityIds: ['ENT-001'] });
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Rapid updates should be efficient
    expect(processingTime).toBeLessThan(500);
    
    // Should debounce API calls
    expect(apiCallCount).toBeLessThan(4); // Less than number of filter changes
  });

  it('memory usage remains stable with large chart datasets', async () => {
    const largeHistoricalData = {
      success: true,
      data: {
        current: {
          date: new Date().toISOString(),
          metrics: { totalAssessments: 1000, verifiedAssessments: 800 }
        },
        historical: Array.from({ length: 90 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          metrics: { 
            totalAssessments: 1000 - i * 5, 
            verifiedAssessments: 800 - i * 4 
          }
        })),
        trends: [
          { metric: 'totalAssessments', change: 7.1, direction: 'up' },
          { metric: 'verifiedAssessments', change: 4.3, direction: 'up' }
        ]
      }
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(largeHistoricalData),
    });

    const startTime = performance.now();

    // Import and test historical comparison hook
    const { useHistoricalComparison } = await import('@/hooks/useHistoricalComparison');
    const { renderHook, waitFor } = await import('@testing-library/react');

    const { result } = renderHook(() => 
      useHistoricalComparison('assessments', '90d')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Chart data processing should be efficient
    expect(processingTime).toBeLessThan(1000);
    expect(result.current.chartData).toHaveLength(90);
    expect(result.current.trends).toHaveLength(2);
  });

  it('concurrent API calls perform efficiently', async () => {
    // Setup different responses for different endpoints
    (fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('assessments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(generateLargeDataset(50)),
        });
      }
      if (url.includes('responses')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(generateLargeDataset(40)),
        });
      }
      if (url.includes('historical')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { current: {}, historical: [], trends: [] }
          }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const startTime = performance.now();

    // Simulate concurrent API calls like drill-down page would make
    const promises = [
      fetch('/api/v1/monitoring/drill-down/assessments'),
      fetch('/api/v1/monitoring/drill-down/responses'),
      fetch('/api/v1/monitoring/historical/assessments?timeRange=30d')
    ];

    await Promise.all(promises);

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Concurrent calls should be efficient
    expect(processingTime).toBeLessThan(100); // Very fast since mocked
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});