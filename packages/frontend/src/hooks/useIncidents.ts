'use client';

import { useCallback } from 'react';
import { useRealData, fetchAPI, UseRealDataOptions, PaginatedResponse } from './useRealData';
import { Incident } from './useRealData';

export interface IncidentFilters {
  status?: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  severity?: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
  type?: 'FLOOD' | 'FIRE' | 'LANDSLIDE' | 'CYCLONE' | 'CONFLICT' | 'EPIDEMIC' | 'OTHER';
  dateFrom?: Date;
  dateTo?: Date;
  hasAssessments?: boolean;
  hasResponses?: boolean;
  affectedEntityIds?: string[];
}

export interface IncidentStats {
  totalIncidents: number;
  activeIncidents: number;
  containedIncidents: number;
  resolvedIncidents: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  highPriorityIncidents: number;
  recentlyUpdated: number;
}

export interface UseIncidentsOptions extends UseRealDataOptions<PaginatedResponse<Incident>> {
  filters?: IncidentFilters;
}

export interface UseIncidentsReturn {
  incidents: Incident[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<PaginatedResponse<Incident> | undefined>;
  refresh: () => Promise<PaginatedResponse<Incident> | undefined>;
  isValidating: boolean;
  // Utility functions
  getActiveIncidents: () => Incident[];
  getCriticalIncidents: () => Incident[];
  getIncidentsByType: (type: string) => Incident[];
  getIncidentsByStatus: (status: string) => Incident[];
  searchIncidents: (query: string) => Incident[];
}

export function useIncidents(options: UseIncidentsOptions = {}): UseIncidentsReturn {
  const { filters = {}, ...realDataOptions } = options;

  const fetchIncidents = useCallback(async (params: any = {}) => {
    const apiParams = {
      ...params,
      ...filters,
      // Convert Date objects to ISO strings for API
      dateFrom: filters.dateFrom?.toISOString(),
      dateTo: filters.dateTo?.toISOString(),
    };

    return fetchAPI<PaginatedResponse<Incident>>('/api/v1/incidents', apiParams);
  }, [filters]);

  const { data, isLoading, error, mutate, refresh, isValidating } = useRealData(
    'incidents',
    fetchIncidents,
    realDataOptions
  );

  const incidents = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    pageSize: 20,
    totalPages: 0,
    totalCount: 0,
  };

  // Utility functions
  const getActiveIncidents = useCallback(() => {
    return incidents.filter(incident => incident.status === 'ACTIVE');
  }, [incidents]);

  const getCriticalIncidents = useCallback(() => {
    return incidents.filter(incident => 
      incident.severity === 'CATASTROPHIC' || incident.severity === 'SEVERE'
    );
  }, [incidents]);

  const getIncidentsByType = useCallback((type: string) => {
    return incidents.filter(incident => incident.type === type);
  }, [incidents]);

  const getIncidentsByStatus = useCallback((status: string) => {
    return incidents.filter(incident => incident.status === status);
  }, [incidents]);

  const searchIncidents = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return incidents.filter(incident =>
      incident.name.toLowerCase().includes(lowercaseQuery) ||
      incident.description?.toLowerCase().includes(lowercaseQuery) ||
      incident.type.toLowerCase().includes(lowercaseQuery)
    );
  }, [incidents]);

  return {
    incidents,
    pagination,
    isLoading,
    error,
    mutate,
    refresh,
    isValidating,
    getActiveIncidents,
    getCriticalIncidents,
    getIncidentsByType,
    getIncidentsByStatus,
    searchIncidents,
  };
}

// Hook for incident statistics
export function useIncidentStats(options: UseRealDataOptions<IncidentStats> = {}) {
  const fetchIncidentStats = useCallback(async () => {
    return fetchAPI<IncidentStats>('/api/v1/incidents/stats');
  }, []);

  return useRealData(
    'incident-stats',
    fetchIncidentStats,
    {
      refreshInterval: 60000, // Refresh every minute
      autoRefresh: true,
      ...options,
    }
  );
}

// Hook for single incident with detailed information
export function useIncidentDetail(
  id: string,
  options: UseRealDataOptions<Incident & {
    affectedEntities: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
    }>;
    assessments: Array<{
      id: string;
      type: string;
      status: string;
      assessorName: string;
      assessmentDate: Date;
    }>;
    responses: Array<{
      id: string;
      responseType: string;
      status: string;
      responderName?: string;
      donorName?: string;
      targetDate: Date;
    }>;
    timeline: Array<{
      id: string;
      eventType: string;
      description: string;
      timestamp: Date;
      userId?: string;
      userName?: string;
    }>;
  }> = {}
) {
  const fetchIncidentDetail = useCallback(async (): Promise<Incident & {
    affectedEntities: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
    }>;
    assessments: Array<{
      id: string;
      type: string;
      status: string;
      assessorName: string;
      assessmentDate: Date;
    }>;
    responses: Array<{
      id: string;
      responseType: string;
      status: string;
      responderName?: string;
      donorName?: string;
      targetDate: Date;
    }>;
    timeline: Array<{
      id: string;
      eventType: string;
      description: string;
      timestamp: Date;
      userId?: string;
      userName?: string;
    }>;
  }> => {
    return fetchAPI(`/api/v1/incidents/${id}`) as any;
  }, [id]);

  return useRealData(
    id ? `incident-detail-${id}` : null,
    fetchIncidentDetail,
    options
  );
}

// Hook for incident timeline
export function useIncidentTimeline(
  id: string,
  options: UseRealDataOptions<Array<{
    id: string;
    eventType: string;
    description: string;
    timestamp: Date;
    userId?: string;
    userName?: string;
    metadata?: Record<string, any>;
  }>> = {}
) {
  const fetchIncidentTimeline = useCallback(async (): Promise<Array<{
    id: string;
    eventType: string;
    description: string;
    timestamp: Date;
    userId?: string;
    userName?: string;
    metadata?: Record<string, any>;
  }>> => {
    return fetchAPI(`/api/v1/incidents/${id}/timeline`) as any;
  }, [id]);

  return useRealData(
    id ? `incident-timeline-${id}` : null,
    fetchIncidentTimeline,
    options
  );
}

// Hook for incident creation
export function useCreateIncident() {
  const createIncident = useCallback(async (incidentData: {
    name: string;
    type: string;
    severity: string;
    description?: string;
    date: Date;
    affectedEntityIds?: string[];
    preliminaryAssessmentIds?: string[];
  }) => {
    return fetchAPI('/api/v1/incidents', incidentData, {
      method: 'POST',
    });
  }, []);

  return { createIncident };
}

// Hook for incident status updates
export function useUpdateIncidentStatus() {
  const updateStatus = useCallback(async (params: {
    incidentId: string;
    status: string;
    reason?: string;
    userId?: string;
  }) => {
    return fetchAPI(`/api/v1/incidents/${params.incidentId}/status`, {
      status: params.status,
      reason: params.reason,
      userId: params.userId,
    }, {
      method: 'PUT',
    });
  }, []);

  return { updateStatus };
}

// Hook for incident-related entities
export function useIncidentEntities(
  id: string,
  options: UseRealDataOptions<Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    relationshipType: string;
    linkedAt: Date;
  }>> = {}
) {
  const fetchIncidentEntities = useCallback(async (): Promise<Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    relationshipType: string;
    linkedAt: Date;
  }>> => {
    return fetchAPI(`/api/v1/incidents/${id}/entities`) as any;
  }, [id]);

  return useRealData(
    id ? `incident-entities-${id}` : null,
    fetchIncidentEntities,
    options
  );
}