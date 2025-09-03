import { useState, useEffect, useCallback } from 'react';

interface FilterState {
  incidentIds?: string[];
  entityIds?: string[];
  timeframe?: { start: string; end: string };
  dataTypes?: string[];
  statusFilters?: string[];
}

interface DrillDownData<T> {
  data: T[];
  aggregations: Record<string, any>;
  totalRecords: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

export function useDrillDownData<T>(
  dataType: 'assessments' | 'responses' | 'incidents' | 'entities',
  filters: FilterState = {},
  page: number = 1,
  limit: number = 50
): DrillDownData<T> & {
  refetch: () => void;
  setPage: (page: number) => void;
} {
  const [data, setData] = useState<T[]>([]);
  const [aggregations, setAggregations] = useState<Record<string, any>>({});
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(page);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const searchParams = new URLSearchParams();
      
      // Build query parameters based on filters
      if (filters.incidentIds?.length) {
        searchParams.append('incidentIds', filters.incidentIds.join(','));
      }
      if (filters.entityIds?.length) {
        searchParams.append('entityIds', filters.entityIds.join(','));
      }
      if (filters.timeframe) {
        searchParams.append('timeframeStart', filters.timeframe.start);
        searchParams.append('timeframeEnd', filters.timeframe.end);
      }
      
      // Add type-specific filters
      switch (dataType) {
        case 'assessments':
          if (filters.dataTypes?.length) {
            searchParams.append('assessmentTypes', filters.dataTypes.join(','));
          }
          if (filters.statusFilters?.length) {
            searchParams.append('verificationStatus', filters.statusFilters.join(','));
          }
          break;
        case 'responses':
          if (filters.dataTypes?.length) {
            searchParams.append('responseTypes', filters.dataTypes.join(','));
          }
          if (filters.statusFilters?.length) {
            searchParams.append('status', filters.statusFilters.join(','));
          }
          break;
        case 'incidents':
          if (filters.dataTypes?.length) {
            searchParams.append('types', filters.dataTypes.join(','));
          }
          if (filters.statusFilters?.length) {
            searchParams.append('statuses', filters.statusFilters.join(','));
          }
          break;
        case 'entities':
          if (filters.dataTypes?.length) {
            searchParams.append('entityTypes', filters.dataTypes.join(','));
          }
          break;
      }
      
      searchParams.append('page', currentPage.toString());
      searchParams.append('limit', limit.toString());
      
      const response = await fetch(`/api/v1/monitoring/drill-down/${dataType}?${searchParams}`);
      const result = await response.json();
      
      if (result.success) {
        // Transform dates in the data
        const transformedData = result.data.map((item: any) => {
          const transformed = { ...item };
          
          // Convert date strings to Date objects
          if (transformed.date) {
            transformed.date = new Date(transformed.date);
          }
          if (transformed.plannedDate) {
            transformed.plannedDate = new Date(transformed.plannedDate);
          }
          if (transformed.deliveredDate) {
            transformed.deliveredDate = new Date(transformed.deliveredDate);
          }
          if (transformed.lastActivity) {
            transformed.lastActivity = new Date(transformed.lastActivity);
          }
          
          return transformed;
        });
        
        setData(transformedData);
        setAggregations(result.meta.aggregations || {});
        setTotalRecords(result.meta.totalRecords || 0);
        setTotalPages(result.meta.totalPages || 1);
      } else {
        setError(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error(`Failed to fetch ${dataType} drill-down data:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [dataType, filters, currentPage, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const setPage = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  return {
    data,
    aggregations,
    totalRecords,
    page: currentPage,
    totalPages,
    isLoading,
    error,
    refetch,
    setPage,
  };
}