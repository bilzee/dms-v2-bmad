import { useState, useEffect, useCallback } from 'react';

interface HistoricalData {
  date: Date;
  metrics: Record<string, number>;
}

interface TrendData {
  metric: string;
  change: number;
  direction: 'up' | 'down' | 'stable';
}

interface Analytics {
  averageChange: number;
  volatilityScore: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  periodComparison?: {
    currentPeriodAvg: number;
    comparisonPeriodAvg: number;
    percentChange: number;
  };
}

interface HistoricalComparisonData {
  current: HistoricalData;
  historical: HistoricalData[];
  trends: TrendData[];
  analytics: Analytics;
}

export function useHistoricalComparison(
  dataType: 'assessments' | 'responses' | 'incidents' | 'entities',
  timeRange: '7d' | '30d' | '90d' = '30d',
  metricTypes: string[] = [],
  comparisonPeriod?: string
) {
  const [data, setData] = useState<HistoricalComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoricalData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('timeRange', timeRange);
      
      if (metricTypes.length > 0) {
        searchParams.append('metricTypes', metricTypes.join(','));
      }
      
      if (comparisonPeriod) {
        searchParams.append('comparisonPeriod', comparisonPeriod);
      }
      
      const response = await fetch(`/api/v1/monitoring/historical/${dataType}?${searchParams}`);
      const result = await response.json();
      
      if (result.success) {
        const transformedData: HistoricalComparisonData = {
          current: {
            ...result.data.current,
            date: new Date(result.data.current.date),
          },
          historical: result.data.historical.map((item: any) => ({
            ...item,
            date: new Date(item.date),
          })),
          trends: result.data.trends,
          analytics: result.data.analytics,
        };
        
        setData(transformedData);
      } else {
        setError(result.message || 'Failed to fetch historical data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error(`Failed to fetch historical ${dataType} data:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [dataType, timeRange, metricTypes, comparisonPeriod]);

  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  const refetch = useCallback(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // Utility functions for working with historical data
  const getMetricTrend = useCallback((metricName: string) => {
    return data?.trends.find(trend => trend.metric === metricName);
  }, [data]);

  const formatChartData = useCallback(() => {
    if (!data) return [];
    
    const chartData = [...data.historical];
    chartData.push(data.current);
    
    return chartData.map(item => ({
      date: item.date.toLocaleDateString(),
      ...item.metrics,
    }));
  }, [data]);

  const getAvailableMetrics = useCallback(() => {
    if (!data?.current) return [];
    return Object.keys(data.current.metrics);
  }, [data]);

  const calculateMetricAverage = useCallback((metricName: string, days?: number) => {
    if (!data) return 0;
    
    const allData = [...data.historical, data.current];
    const relevantData = days ? allData.slice(-days) : allData;
    const values = relevantData.map(item => item.metrics[metricName]).filter(val => val !== undefined);
    
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }, [data]);

  const getMetricRange = useCallback((metricName: string) => {
    if (!data) return { min: 0, max: 0 };
    
    const allData = [...data.historical, data.current];
    const values = allData.map(item => item.metrics[metricName]).filter(val => val !== undefined);
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [data]);

  return {
    data: data ? [...data.historical, data.current].map((item, index) => ({
      ...item,
      index,
    })) as any[] : [],
    aggregations: {
      trends: data?.trends || [],
      analytics: data?.analytics || {},
    },
    totalRecords: data ? data.historical.length + 1 : 0,
    page: 1, // Historical data doesn't use pagination
    totalPages: 1,
    isLoading,
    error,
    refetch,
    setPage: () => {}, // Not applicable for historical data
    
    // Additional utilities
    getMetricTrend,
    formatChartData,
    getAvailableMetrics,
    calculateMetricAverage,
    getMetricRange,
    currentData: data?.current,
    historicalData: data?.historical || [],
    trends: data?.trends || [],
    analytics: data?.analytics || {},
  };
}