'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDonorStore } from '@/stores/donor.store';

interface UsePerformanceOptions {
  period?: '30' | '90' | '365' | 'all';
  responseType?: string;
  location?: string;
  region?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  autoLoad?: boolean;
}

interface PerformanceFilters {
  period: string;
  responseType?: string;
  location?: string;
  region?: string;
  granularity?: string;
}

export function useDonorPerformance(options: UsePerformanceOptions = {}) {
  const {
    period = '90',
    responseType,
    location,
    region,
    granularity = 'weekly',
    autoLoad = true
  } = options;

  const {
    performanceMetrics,
    performanceHistory,
    impactMetrics,
    loadingPerformance,
    performanceError,
    loadPerformanceMetrics,
    loadPerformanceHistory,
    loadImpactMetrics,
    refreshPerformanceData,
    clearPerformanceError,
  } = useDonorStore();

  const [filters, setFilters] = useState<PerformanceFilters>({
    period,
    responseType,
    location,
    region,
    granularity,
  });

  // Load performance data
  const loadData = useCallback(async (filterOverrides?: Partial<PerformanceFilters>) => {
    const currentFilters = { ...filters, ...filterOverrides };
    
    try {
      await Promise.allSettled([
        loadPerformanceMetrics(
          currentFilters.period, 
          currentFilters.responseType, 
          currentFilters.location
        ),
        loadPerformanceHistory(
          currentFilters.period, 
          currentFilters.granularity
        ),
        loadImpactMetrics(
          currentFilters.period, 
          currentFilters.responseType, 
          currentFilters.region
        ),
      ]);
    } catch (error) {
      console.error('Error loading performance data:', error);
    }
  }, [filters, loadPerformanceMetrics, loadPerformanceHistory, loadImpactMetrics]);

  // Update filters and reload data
  const updateFilters = useCallback(async (newFilters: Partial<PerformanceFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    await loadData(newFilters);
  }, [filters, loadData]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await refreshPerformanceData();
  }, [refreshPerformanceData]);

  // Auto-load data on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad]); // Only run on mount and when autoLoad changes

  // Calculate derived metrics
  const derivedMetrics = {
    // Performance trends
    performanceTrend: performanceHistory.length > 1 
      ? performanceHistory[performanceHistory.length - 1]?.performanceScore - performanceHistory[0]?.performanceScore
      : 0,
    
    // Delivery efficiency
    averageBeneficiariesPerDelivery: performanceMetrics
      ? Math.round(performanceMetrics.beneficiariesHelped / Math.max(performanceMetrics.completedDeliveries, 1))
      : 0,
    
    // Growth rate
    impactGrowthRate: performanceHistory.length > 1
      ? ((performanceHistory[performanceHistory.length - 1]?.beneficiariesHelped || 0) - 
         (performanceHistory[0]?.beneficiariesHelped || 0)) / 
         Math.max(performanceHistory[0]?.beneficiariesHelped || 1, 1) * 100
      : 0,
    
    // Achievement progress (mock calculation)
    nextMilestone: {
      type: 'MILESTONE_25',
      current: performanceMetrics?.completedDeliveries || 0,
      target: 25,
      progress: ((performanceMetrics?.completedDeliveries || 0) / 25) * 100,
    }
  };

  // Performance insights
  const insights = {
    strengths: [] as string[],
    improvements: [] as string[],
    trends: [] as string[],
  };

  if (performanceMetrics) {
    // Analyze strengths
    if (performanceMetrics.onTimeDeliveryRate > 90) {
      insights.strengths.push('Excellent on-time delivery performance');
    }
    if (performanceMetrics.quantityAccuracyRate > 95) {
      insights.strengths.push('Outstanding quantity accuracy');
    }
    if (performanceMetrics.performanceScore > 85) {
      insights.strengths.push('High overall performance score');
    }

    // Identify improvement areas
    if (performanceMetrics.onTimeDeliveryRate < 80) {
      insights.improvements.push('Focus on improving delivery timeliness');
    }
    if (performanceMetrics.quantityAccuracyRate < 85) {
      insights.improvements.push('Work on quantity accuracy planning');
    }

    // Trend analysis
    if (derivedMetrics.performanceTrend > 5) {
      insights.trends.push('Performance is trending upward');
    } else if (derivedMetrics.performanceTrend < -5) {
      insights.trends.push('Performance shows declining trend');
    } else {
      insights.trends.push('Performance remains stable');
    }
  }

  return {
    // Data
    performanceMetrics,
    performanceHistory,
    impactMetrics,
    derivedMetrics,
    insights,
    
    // State
    loading: loadingPerformance,
    error: performanceError,
    filters,
    
    // Actions
    loadData,
    updateFilters,
    refresh,
    clearError: clearPerformanceError,
    
    // Computed values
    hasData: !!(performanceMetrics || performanceHistory.length > 0 || impactMetrics),
    isEmpty: !performanceMetrics && performanceHistory.length === 0 && !impactMetrics,
  };
}

// Hook for tracking performance updates in real-time
export function usePerformanceTracking() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { performanceMetrics, refresh } = useDonorPerformance({ autoLoad: false });

  // Track when performance data was last updated
  useEffect(() => {
    if (performanceMetrics?.lastUpdated) {
      setLastUpdate(new Date(performanceMetrics.lastUpdated));
    }
  }, [performanceMetrics?.lastUpdated]);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refresh]);

  return {
    lastUpdate,
    timeSinceUpdate: Date.now() - lastUpdate.getTime(),
    refresh,
  };
}

// Hook for performance comparisons
export function usePerformanceComparison(timeframes: string[] = ['30', '90']) {
  const [comparisonData, setComparisonData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const { loadPerformanceMetrics } = useDonorStore();

  const loadComparison = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        timeframes.map(period => 
          fetch(`/api/v1/donors/performance?period=${period}`)
            .then(res => res.json())
            .then(data => ({ period, data: data.data?.metrics }))
        )
      );

      const comparison: Record<string, any> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          comparison[timeframes[index]] = result.value.data;
        }
      });

      setComparisonData(comparison);
    } catch (error) {
      console.error('Error loading performance comparison:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframes]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  return {
    comparisonData,
    loading,
    refresh: loadComparison,
  };
}