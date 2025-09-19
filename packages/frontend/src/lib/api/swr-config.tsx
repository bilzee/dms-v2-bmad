'use client';

import useSWR, { SWRConfig, SWRConfiguration } from 'swr';
import React from 'react';
import { useDataStore } from '@/stores/data.store';

// Custom fetcher with error handling and caching
export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`);
      error.name = 'HTTPError';
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Cache configuration
export const cacheConfig = {
  // Dedupe identical requests within this timeframe (5 seconds)
  dedupingInterval: 5000,
  
  // Revalidate on focus
  revalidateOnFocus: true,
  
  // Revalidate on reconnect
  revalidateOnReconnect: true,
  
  // Focus throttle interval (2 seconds)
  focusThrottleInterval: 2000,
  
  // Error retry configuration
  errorRetryCount: 3,
  errorRetryInterval: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  
  // Loading timeout (30 seconds)
  loadingTimeout: 30000,
  
  // Provider for custom cache storage
  provider: () => {
    // Use a simple Map-based cache for now
    // In production, this could be enhanced with IndexedDB for persistence
    const cache = new Map();
    
    return {
      get: (key: string) => cache.get(key),
      set: (key: string, value: any) => cache.set(key, value),
      delete: (key: string) => cache.delete(key),
      keys: () => Array.from(cache.keys()),
    };
  },
};

// Role-based fetcher with user context
export async function fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
  // Add authentication headers if available
  const authHeaders = {};
  
  try {
    // Get user session if available (this would be replaced with actual auth logic)
    const response = await fetch('/api/auth/session', { credentials: 'include' });
    if (response.ok) {
      const session = await response.json();
      if (session?.user) {
        Object.assign(authHeaders, {
          'X-User-Id': session.user.id,
          'X-User-Role': session.user.activeRole?.name,
          'X-User-Permissions': JSON.stringify(session.user.permissions || []),
        });
      }
    }
  } catch (error) {
    // Silently ignore auth errors - endpoint might not be available
    console.warn('Auth check failed:', error);
  }

  return fetcher<T>(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options?.headers,
    },
  });
}

// Fetcher with offline support
export async function fetchWithOfflineSupport<T>(
  key: string,
  url: string,
  options?: RequestInit
): Promise<T> {
  const { offlineData } = useDataStore.getState();
  
  try {
    // Try to fetch fresh data
    const data = await fetchWithAuth<T>(url, options);
    
    // Update offline cache on successful fetch
    // This would be implemented based on the data type
    return data;
  } catch (error) {
    // If network error, try to get cached data
    if (error instanceof Error && error.message.includes('network')) {
      const cachedData = getCachedData(key);
      if (cachedData) {
        return cachedData as T;
      }
    }
    throw error;
  }
}

// Get cached data from storage
function getCachedData(key: string): any {
  try {
    const cacheKey = `cache_${key}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Return cached data if it's less than 1 hour old
      if (Date.now() - timestamp < 3600000) {
        return data;
      }
      localStorage.removeItem(cacheKey);
    }
  } catch (error) {
    console.warn('Failed to get cached data:', error);
  }
  return null;
}

// Cache data to storage
function cacheData(key: string, data: any): void {
  try {
    const cacheKey = `cache_${key}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

// Custom SWR configuration for different data types
export const swrConfigs = {
  // Configuration for real-time data (stats, monitoring)
  realtime: {
    refreshInterval: 10000, // 10 seconds
    dedupingInterval: 2000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    focusThrottleInterval: 1000,
    errorRetryCount: 2,
    errorRetryInterval: 1000,
  } as SWRConfiguration,

  // Configuration for user data (less frequent updates)
  userData: {
    refreshInterval: 60000, // 1 minute
    dedupingInterval: 10000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    errorRetryInterval: 2000,
  } as SWRConfiguration,

  // Configuration for static data (rarely changes)
  staticData: {
    refreshInterval: 300000, // 5 minutes
    dedupingInterval: 60000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 1,
  } as SWRConfiguration,

  // Configuration for critical data (always fresh)
  critical: {
    refreshInterval: 5000, // 5 seconds
    dedupingInterval: 1000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    focusThrottleInterval: 500,
    errorRetryCount: 5,
    errorRetryInterval: 500,
  } as SWRConfiguration,
};

// Hook for cached data with fallback
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: SWRConfiguration = {}
) {
  const { data, error, mutate, ...rest } = useSWR<T>(
    key,
    async () => {
      try {
        const data = await fetcher();
        cacheData(key, data);
        return data;
      } catch (error) {
        // Try to get cached data on error
        const cachedData = getCachedData(key);
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    {
      ...cacheConfig,
      ...config,
    }
  );

  return {
    data,
    error,
    mutate,
    ...rest,
  };
}

// Hook for optimistic updates
export function useOptimisticData<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: SWRConfiguration = {}
) {
  const { data, error, mutate, ...rest } = useSWR<T>(
    key,
    fetcher,
    {
      ...cacheConfig,
      ...config,
      populateCache: true,
      revalidate: true,
      rollbackOnError: true,
    }
  );

  const optimisticUpdate = async (
    updateFn: (currentData: T | undefined) => T,
    optimisticData: T,
    shouldRevalidate = true
  ) => {
    try {
      // Show optimistic UI immediately
      await mutate(
        async (currentData) => {
          return updateFn(currentData);
        },
        {
          optimisticData,
          populateCache: true,
          revalidate: shouldRevalidate,
          rollbackOnError: true,
        }
      );
    } catch (error) {
      console.error('Optimistic update failed:', error);
      throw error;
    }
  };

  return {
    data,
    error,
    mutate,
    optimisticUpdate,
    ...rest,
  };
}

// Hook for paginated data
export function usePaginatedData<T>(
  key: string,
  fetcher: (page: number, pageSize: number) => Promise<{
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalCount: number;
    };
  }>,
  config: SWRConfiguration = {}
) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const { data, error, mutate, ...rest } = useSWR(
    [key, page, pageSize],
    () => fetcher(page, pageSize),
    {
      ...cacheConfig,
      ...config,
      keepPreviousData: true,
    }
  );

  return {
    data: data?.data || [],
    pagination: data?.pagination || {
      page,
      pageSize,
      totalPages: 1,
      totalCount: 0,
    },
    error,
    mutate,
    setPage,
    setPageSize,
    ...rest,
  };
}

// SWR Provider component
export function SWRProvider({ children }: { children: React.ReactNode }) {
  const config: SWRConfiguration = {
    fetcher: fetchWithAuth,
    ...cacheConfig,
  };

  return (
    <SWRConfig value={config}>
      {children}
    </SWRConfig>
  );
}