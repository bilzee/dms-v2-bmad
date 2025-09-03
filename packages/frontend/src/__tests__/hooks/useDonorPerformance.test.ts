import { renderHook, act, waitFor } from '@testing-library/react';
import { useDonorPerformance } from '@/hooks/useDonorPerformance';
import { useDonorStore } from '@/stores/donor.store';

// Mock the donor store
jest.mock('@/stores/donor.store', () => ({
  useDonorStore: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseDonorStore = useDonorStore as jest.MockedFunction<typeof useDonorStore>;

describe('useDonorPerformance', () => {
  const mockStoreActions = {
    performanceMetrics: null,
    performanceHistory: [],
    impactMetrics: null,
    loadingPerformance: false,
    performanceError: null,
    loadPerformanceMetrics: jest.fn(),
    loadPerformanceHistory: jest.fn(),
    loadImpactMetrics: jest.fn(),
    refreshPerformanceData: jest.fn(),
    clearPerformanceError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDonorStore.mockReturnValue(mockStoreActions);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { metrics: { performanceScore: 89 } }
      }),
    });
  });

  it('initializes with default options', () => {
    const { result } = renderHook(() => useDonorPerformance());

    expect(result.current.filters.period).toBe('90');
    expect(result.current.filters.granularity).toBe('weekly');
    expect(result.current.hasData).toBe(false);
    expect(result.current.isEmpty).toBe(true);
  });

  it('auto-loads data when autoLoad is true (default)', async () => {
    renderHook(() => useDonorPerformance());

    await waitFor(() => {
      expect(mockStoreActions.loadPerformanceMetrics).toHaveBeenCalledWith('90', undefined, undefined);
      expect(mockStoreActions.loadPerformanceHistory).toHaveBeenCalledWith('90', 'weekly');
      expect(mockStoreActions.loadImpactMetrics).toHaveBeenCalledWith('90', undefined, undefined);
    });
  });

  it('does not auto-load when autoLoad is false', () => {
    renderHook(() => useDonorPerformance({ autoLoad: false }));

    expect(mockStoreActions.loadPerformanceMetrics).not.toHaveBeenCalled();
    expect(mockStoreActions.loadPerformanceHistory).not.toHaveBeenCalled();
    expect(mockStoreActions.loadImpactMetrics).not.toHaveBeenCalled();
  });

  it('uses custom options correctly', async () => {
    const options = {
      period: '30' as const,
      responseType: 'MEDICAL_SUPPLIES',
      location: 'northern',
      granularity: 'daily' as const,
    };

    renderHook(() => useDonorPerformance(options));

    await waitFor(() => {
      expect(mockStoreActions.loadPerformanceMetrics).toHaveBeenCalledWith('30', 'MEDICAL_SUPPLIES', 'northern');
      expect(mockStoreActions.loadPerformanceHistory).toHaveBeenCalledWith('30', 'daily');
      expect(mockStoreActions.loadImpactMetrics).toHaveBeenCalledWith('30', 'MEDICAL_SUPPLIES', undefined);
    });
  });

  it('updates filters and reloads data', async () => {
    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    await act(async () => {
      await result.current.updateFilters({ period: '365', responseType: 'FOOD_WATER' });
    });

    expect(result.current.filters.period).toBe('365');
    expect(result.current.filters.responseType).toBe('FOOD_WATER');
    expect(mockStoreActions.loadPerformanceMetrics).toHaveBeenCalledWith('365', 'FOOD_WATER', undefined);
  });

  it('refreshes data using store refresh function', async () => {
    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockStoreActions.refreshPerformanceData).toHaveBeenCalled();
  });

  it('calculates derived metrics correctly', () => {
    const mockPerformanceMetrics = {
      beneficiariesHelped: 500,
      completedDeliveries: 10,
    };

    const mockPerformanceHistory = [
      { performanceScore: 85, beneficiariesHelped: 100 },
      { performanceScore: 90, beneficiariesHelped: 500 },
    ];

    mockUseDonorStore.mockReturnValue({
      ...mockStoreActions,
      performanceMetrics: mockPerformanceMetrics,
      performanceHistory: mockPerformanceHistory,
    });

    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    expect(result.current.derivedMetrics.averageBeneficiariesPerDelivery).toBe(50); // 500/10
    expect(result.current.derivedMetrics.performanceTrend).toBe(5); // 90-85
    expect(result.current.derivedMetrics.impactGrowthRate).toBe(400); // ((500-100)/100)*100
  });

  it('handles empty performance history gracefully', () => {
    mockUseDonorStore.mockReturnValue({
      ...mockStoreActions,
      performanceHistory: [],
    });

    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    expect(result.current.derivedMetrics.performanceTrend).toBe(0);
    expect(result.current.derivedMetrics.impactGrowthRate).toBe(0);
  });

  it('calculates next milestone progress correctly', () => {
    const mockPerformanceMetrics = {
      completedDeliveries: 15,
    };

    mockUseDonorStore.mockReturnValue({
      ...mockStoreActions,
      performanceMetrics: mockPerformanceMetrics,
    });

    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    expect(result.current.derivedMetrics.nextMilestone.current).toBe(15);
    expect(result.current.derivedMetrics.nextMilestone.target).toBe(25);
    expect(result.current.derivedMetrics.nextMilestone.progress).toBe(60); // (15/25)*100
  });

  it('generates insights based on performance metrics', () => {
    const mockPerformanceMetrics = {
      onTimeDeliveryRate: 95, // > 90, should be a strength
      quantityAccuracyRate: 98, // > 95, should be a strength
      performanceScore: 87, // > 85, should be a strength
    };

    mockUseDonorStore.mockReturnValue({
      ...mockStoreActions,
      performanceMetrics: mockPerformanceMetrics,
    });

    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    expect(result.current.insights.strengths).toContain('Excellent on-time delivery performance');
    expect(result.current.insights.strengths).toContain('Outstanding quantity accuracy');
    expect(result.current.insights.strengths).toContain('High overall performance score');
  });

  it('identifies improvement areas for low performance', () => {
    const mockPerformanceMetrics = {
      onTimeDeliveryRate: 75, // < 80, should be improvement area
      quantityAccuracyRate: 80, // < 85, should be improvement area
      performanceScore: 70,
    };

    mockUseDonorStore.mockReturnValue({
      ...mockStoreActions,
      performanceMetrics: mockPerformanceMetrics,
    });

    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    expect(result.current.insights.improvements).toContain('Focus on improving delivery timeliness');
    expect(result.current.insights.improvements).toContain('Work on quantity accuracy planning');
  });

  it('analyzes performance trends correctly', () => {
    const mockPerformanceHistory = [
      { performanceScore: 85, beneficiariesHelped: 100 },
      { performanceScore: 92, beneficiariesHelped: 500 }, // +7 trend, should be upward
    ];

    mockUseDonorStore.mockReturnValue({
      ...mockStoreActions,
      performanceHistory: mockPerformanceHistory,
    });

    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    expect(result.current.insights.trends).toContain('Performance is trending upward');
  });

  it('determines hasData and isEmpty correctly', () => {
    // Test with no data
    mockUseDonorStore.mockReturnValue({
      ...mockStoreActions,
      performanceMetrics: null,
      performanceHistory: [],
      impactMetrics: null,
    });

    const { result: resultEmpty } = renderHook(() => useDonorPerformance({ autoLoad: false }));
    expect(resultEmpty.current.hasData).toBe(false);
    expect(resultEmpty.current.isEmpty).toBe(true);

    // Test with some data
    mockUseDonorStore.mockReturnValue({
      ...mockStoreActions,
      performanceMetrics: { performanceScore: 89 },
      performanceHistory: [],
      impactMetrics: null,
    });

    const { result: resultWithData } = renderHook(() => useDonorPerformance({ autoLoad: false }));
    expect(resultWithData.current.hasData).toBe(true);
    expect(resultWithData.current.isEmpty).toBe(false);
  });

  it('handles loading and error states', () => {
    mockUseDonorStore.mockReturnValue({
      ...mockStoreActions,
      loadingPerformance: true,
      performanceError: 'Test error',
    });

    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('Test error');
  });

  it('exposes clearError function', () => {
    const { result } = renderHook(() => useDonorPerformance({ autoLoad: false }));

    act(() => {
      result.current.clearError();
    });

    expect(mockStoreActions.clearPerformanceError).toHaveBeenCalled();
  });
});