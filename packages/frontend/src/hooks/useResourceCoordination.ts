import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';

interface ResourceAvailability {
  responseType: string;
  totalCommitted: number;
  totalAllocated: number;
  totalAvailable: number;
  unit: string;
  commitments: any[];
  allocations: any[];
  projectedShortfall: number;
  earliestAvailable: Date;
  lastUpdated: Date;
}

interface ResourceCoordinationData {
  resources: ResourceAvailability[];
  summary: {
    totalResourceTypes: number;
    resourcesWithShortfalls: number;
    resourcesFullyAllocated: number;
    totalCommitments: number;
    totalAllocations: number;
    criticalShortfalls: any[];
    upcomingDeadlines: any[];
  };
}

interface UseResourceCoordinationOptions {
  incidentId?: string;
  responseTypes?: string[];
  refreshInterval?: number;
}

interface UseResourceCoordinationReturn {
  data: ResourceCoordinationData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  allocateResource: (request: any) => Promise<any>;
  isAllocating: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useResourceCoordination = (options: UseResourceCoordinationOptions = {}): UseResourceCoordinationReturn => {
  const { incidentId, responseTypes, refreshInterval = 300000 } = options; // 5 minutes default
  const [isAllocating, setIsAllocating] = useState(false);

  // Build URL with query parameters
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (incidentId) params.append('incidentId', incidentId);
    if (responseTypes?.length) params.append('responseTypes', responseTypes.join(','));
    
    return `/api/v1/coordinator/resources/available${params.toString() ? '?' + params.toString() : ''}`;
  }, [incidentId, responseTypes]);

  const { data, error, mutate } = useSWR(
    buildUrl(),
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000 // Dedupe requests within 1 minute
    }
  );

  const allocateResource = useCallback(async (request: any) => {
    try {
      setIsAllocating(true);
      const response = await fetch('/api/v1/coordinator/resources/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.errors?.[0] || 'Failed to allocate resource');
      }

      // Refresh resource data after successful allocation
      mutate();
      
      return result.data;
    } catch (error) {
      console.error('Failed to allocate resource:', error);
      throw error;
    } finally {
      setIsAllocating(false);
    }
  }, [mutate]);

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    data: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refresh,
    allocateResource,
    isAllocating
  };
};