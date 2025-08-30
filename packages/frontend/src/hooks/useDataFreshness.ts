'use client';

import { useState, useEffect, useCallback } from 'react';

interface DataFreshnessIndicator {
  category: 'assessments' | 'responses' | 'incidents' | 'entities';
  totalCount: number;
  realTimeCount: number; // Synced within 5 minutes
  recentCount: number; // Synced within 1 hour
  offlinePendingCount: number; // Not yet synced
  oldestPending?: Date;
  syncQueueSize: number;
}

interface DataFreshnessOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  categoryFilter?: 'assessments' | 'responses' | 'incidents' | 'entities';
  onError?: (error: string) => void;
}

export const useDataFreshness = (options: DataFreshnessOptions = {}) => {
  const {
    refreshInterval = 25000,
    autoRefresh = true,
    categoryFilter,
    onError
  } = options;

  const [freshnessData, setFreshnessData] = useState<DataFreshnessIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [summaryStats, setSummaryStats] = useState({
    totalItems: 0,
    totalRealTime: 0,
    totalRecent: 0,
    totalOfflinePending: 0,
    totalQueueSize: 0,
    realTimePercentage: 0,
    recentPercentage: 0,
    offlinePendingPercentage: 0,
    oldestPending: undefined as Date | undefined,
  });

  const fetchDataFreshness = useCallback(async () => {
    try {
      setError(null);
      const searchParams = new URLSearchParams();
      
      if (categoryFilter) searchParams.append('category', categoryFilter);
      searchParams.append('includeDetails', 'true');
      
      const response = await fetch(`/api/v1/monitoring/situation/data-freshness?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setFreshnessData(data.data.map((indicator: any) => ({
          ...indicator,
          oldestPending: indicator.oldestPending ? new Date(indicator.oldestPending) : undefined,
        })));
        
        setSummaryStats({
          ...data.meta.summary,
          oldestPending: data.meta.summary.oldestPending ? new Date(data.meta.summary.oldestPending) : undefined,
        });
        
        setLastUpdated(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch data freshness indicators');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data freshness indicators';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, onError]);

  useEffect(() => {
    fetchDataFreshness();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDataFreshness, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDataFreshness, refreshInterval, autoRefresh]);

  const getCategoryData = useCallback((category: DataFreshnessIndicator['category']) => {
    return freshnessData.find(data => data.category === category);
  }, [freshnessData]);

  const getCategoryFreshnessPercentage = useCallback((category: DataFreshnessIndicator['category'], type: 'realTime' | 'recent' | 'offlinePending') => {
    const categoryData = getCategoryData(category);
    if (!categoryData || categoryData.totalCount === 0) return 0;
    
    const count = categoryData[type === 'realTime' ? 'realTimeCount' : 
                               type === 'recent' ? 'recentCount' : 'offlinePendingCount'];
    return Math.round((count / categoryData.totalCount) * 100);
  }, [getCategoryData]);

  const getTotalQueueSize = useCallback(() => {
    return freshnessData.reduce((sum, indicator) => sum + indicator.syncQueueSize, 0);
  }, [freshnessData]);

  const getCategoriesWithHighOfflinePending = useCallback((threshold: number = 20) => {
    return freshnessData.filter(indicator => {
      const offlinePendingPercentage = indicator.totalCount > 0 
        ? (indicator.offlinePendingCount / indicator.totalCount) * 100 
        : 0;
      return offlinePendingPercentage > threshold;
    });
  }, [freshnessData]);

  const getOldestPendingAcrossCategories = useCallback(() => {
    const allOldestPending = freshnessData
      .map(indicator => indicator.oldestPending)
      .filter((date): date is Date => date !== undefined);
    
    if (allOldestPending.length === 0) return undefined;
    
    return new Date(Math.min(...allOldestPending.map(d => d.getTime())));
  }, [freshnessData]);

  const getFreshnessStatus = useCallback(() => {
    const realTimePercentage = summaryStats.realTimePercentage;
    const offlinePendingPercentage = summaryStats.offlinePendingPercentage;
    
    if (realTimePercentage >= 90) return 'EXCELLENT';
    if (realTimePercentage >= 70) return 'GOOD';
    if (offlinePendingPercentage <= 10) return 'FAIR';
    return 'POOR';
  }, [summaryStats]);

  return {
    freshnessData,
    summaryStats,
    isLoading,
    error,
    lastUpdated,
    connectionStatus,
    refresh: fetchDataFreshness,
    getCategoryData,
    getCategoryFreshnessPercentage,
    getTotalQueueSize,
    getCategoriesWithHighOfflinePending,
    getOldestPendingAcrossCategories,
    getFreshnessStatus,
  };
};