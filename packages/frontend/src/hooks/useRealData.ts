'use client';

import useSWR, { SWRConfig, SWRConfiguration } from 'swr';
import { useState, useCallback, useEffect } from 'react';

// Types aligned with Prisma schema
export interface Incident {
  id: string;
  name: string;
  type: 'FLOOD' | 'FIRE' | 'LANDSLIDE' | 'CYCLONE' | 'CONFLICT' | 'EPIDEMIC' | 'OTHER';
  severity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  date: Date;
  description?: string;
  affectedEntityCount: number;
  assessmentCount: number;
  responseCount: number;
  lastUpdated: Date;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Assessment {
  id: string;
  type: 'PRELIMINARY' | 'RAPID' | 'HEALTH' | 'POPULATION' | 'FOOD' | 'SHELTER' | 'SECURITY';
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  assessorId: string;
  assessorName: string;
  incidentId?: string;
  incidentName?: string;
  affectedEntityId: string;
  affectedEntityName: string;
  assessmentDate: Date;
  lastUpdated: Date;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
}

export interface Response {
  id: string;
  responseType: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  assessmentId: string;
  assessmentType: string;
  responderId?: string;
  responderName?: string;
  donorId?: string;
  donorName?: string;
  targetDate: Date;
  actualDate?: Date;
  estimatedBudget: number;
  actualBudget?: number;
  affectedEntityId: string;
  affectedEntityName: string;
  lastUpdated: Date;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
}

// Common interfaces for all data hooks
export interface DataFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchTerm?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  meta: {
    timestamp: string;
    version: string;
    syncToken?: string;
  };
}

export interface UseRealDataOptions<T> extends SWRConfiguration {
  refreshInterval?: number;
  autoRefresh?: boolean;
  filters?: DataFilters & Record<string, any>;
  roleBasedFilter?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

export interface UseRealDataReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<T | undefined>;
  refresh: () => Promise<T | undefined>;
  isValidating: boolean;
}

// Base hook for real data fetching with common patterns
export function useRealData<T>(
  key: string | string[] | null,
  fetcher: (params?: any) => Promise<T>,
  options: UseRealDataOptions<T> = {}
): UseRealDataReturn<T> {
  const {
    refreshInterval = 30000,
    autoRefresh = true,
    filters = {},
    roleBasedFilter = true,
    onError,
    onSuccess,
    ...swrOptions
  } = options;

  // Build SWR key with filters
  const swrKey = key ? [key, filters].filter(Boolean) : null;

  const { data, error, mutate, isValidating } = useSWR<T>(
    swrKey,
    async () => {
      try {
        const result = await fetcher(filters);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        onError?.(error);
        throw error;
      }
    },
    {
      refreshInterval: autoRefresh ? refreshInterval : 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      ...swrOptions,
    }
  );

  const refresh = useCallback(async () => {
    return await mutate();
  }, [mutate]);

  return {
    data,
    isLoading: !error && !data,
    error,
    mutate,
    refresh,
    isValidating,
  };
}

// Generic API fetcher with role-based filtering
export async function fetchAPI<T>(
  endpoint: string,
  params?: Record<string, any>,
  options?: RequestInit
): Promise<T> {
  const url = new URL(endpoint, window.location.origin);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          url.searchParams.append(key, JSON.stringify(value));
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'API request failed');
  }

  return result.data;
}

// Hook for incidents data
export function useIncidents(options: UseRealDataOptions<PaginatedResponse<Incident>> = {}) {
  const fetchIncidents = useCallback(async (filters: DataFilters & {
    status?: string;
    severity?: string;
    type?: string;
  } = {}) => {
    return fetchAPI<PaginatedResponse<Incident>>('/api/v1/incidents', filters);
  }, []);

  return useRealData<PaginatedResponse<Incident>>(
    'incidents',
    fetchIncidents,
    options
  );
}

// Hook for assessments data
export function useAssessments(options: UseRealDataOptions<PaginatedResponse<Assessment>> = {}) {
  const fetchAssessments = useCallback(async (filters: DataFilters & {
    type?: string;
    status?: string;
    verificationStatus?: string;
    incidentId?: string;
  } = {}) => {
    return fetchAPI<PaginatedResponse<Assessment>>('/api/v1/assessments', filters);
  }, []);

  return useRealData<PaginatedResponse<Assessment>>(
    'assessments',
    fetchAssessments,
    options
  );
}

// Hook for responses data
export function useResponses(options: UseRealDataOptions<PaginatedResponse<Response>> = {}) {
  const fetchResponses = useCallback(async (filters: DataFilters & {
    responseType?: string;
    status?: string;
    assessmentId?: string;
    donorId?: string;
  } = {}) => {
    return fetchAPI<PaginatedResponse<Response>>('/api/v1/responses', filters);
  }, []);

  return useRealData<PaginatedResponse<Response>>(
    'responses',
    fetchResponses,
    options
  );
}

// Hook for single incident
export function useIncident(id: string, options: UseRealDataOptions<Incident> = {}) {
  const fetchIncident = useCallback(async () => {
    return fetchAPI<Incident>(`/api/v1/incidents/${id}`);
  }, [id]);

  return useRealData<Incident>(
    id ? `incident-${id}` : null,
    fetchIncident,
    options
  );
}

// Hook for single assessment
export function useAssessment(id: string, options: UseRealDataOptions<Assessment> = {}) {
  const fetchAssessment = useCallback(async () => {
    return fetchAPI<Assessment>(`/api/v1/assessments/${id}`);
  }, [id]);

  return useRealData<Assessment>(
    id ? `assessment-${id}` : null,
    fetchAssessment,
    options
  );
}

// Hook for single response
export function useResponse(id: string, options: UseRealDataOptions<Response> = {}) {
  const fetchResponse = useCallback(async () => {
    return fetchAPI<Response>(`/api/v1/responses/${id}`);
  }, [id]);

  return useRealData<Response>(
    id ? `response-${id}` : null,
    fetchResponse,
    options
  );
}

// Hook for incidents related to assessments
export function useIncidentAssessments(incidentId: string, options: UseRealDataOptions<PaginatedResponse<Assessment>> = {}) {
  const fetchIncidentAssessments = useCallback(async (filters: DataFilters = {}) => {
    return fetchAPI<PaginatedResponse<Assessment>>(`/api/v1/incidents/${incidentId}/assessments`, filters);
  }, [incidentId]);

  return useRealData<PaginatedResponse<Assessment>>(
    incidentId ? `incident-${incidentId}-assessments` : null,
    fetchIncidentAssessments,
    options
  );
}

// Hook for responses related to assessments
export function useAssessmentResponses(assessmentId: string, options: UseRealDataOptions<PaginatedResponse<Response>> = {}) {
  const fetchAssessmentResponses = useCallback(async (filters: DataFilters = {}) => {
    return fetchAPI<PaginatedResponse<Response>>(`/api/v1/assessments/${assessmentId}/responses`, filters);
  }, [assessmentId]);

  return useRealData<PaginatedResponse<Response>>(
    assessmentId ? `assessment-${assessmentId}-responses` : null,
    fetchAssessmentResponses,
    options
  );
}

// Hook for real-time statistics
export function useRealTimeStats(options: UseRealDataOptions<{
  totalIncidents: number;
  activeIncidents: number;
  totalAssessments: number;
  pendingAssessments: number;
  totalResponses: number;
  activeResponses: number;
}> = {}) {
  const fetchStats = useCallback(async (): Promise<{
    totalIncidents: number;
    activeIncidents: number;
    totalAssessments: number;
    pendingAssessments: number;
    totalResponses: number;
    activeResponses: number;
  }> => {
    return fetchAPI('/api/v1/monitoring/situation/overview') as any;
  }, []);

  return useRealData(
    'real-time-stats',
    fetchStats,
    {
      refreshInterval: 10000, // More frequent refresh for stats
      autoRefresh: true,
      ...options,
    }
  );
}

// Hook for data synchronization status
export function useSyncStatus(options: UseRealDataOptions<{
  lastSync: Date;
  pendingChanges: number;
  syncStatus: 'SYNCED' | 'SYNCING' | 'FAILED';
}> = {}) {
  const fetchSyncStatus = useCallback(async (): Promise<{
    lastSync: Date;
    pendingChanges: number;
    syncStatus: 'SYNCED' | 'SYNCING' | 'FAILED';
  }> => {
    return fetchAPI('/api/v1/sync/status') as any;
  }, []);

  return useRealData(
    'sync-status',
    fetchSyncStatus,
    {
      refreshInterval: 5000,
      autoRefresh: true,
      ...options,
    }
  );
}