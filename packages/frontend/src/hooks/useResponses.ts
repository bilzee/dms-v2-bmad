'use client';

import { useCallback } from 'react';
import { useRealData, fetchAPI, UseRealDataOptions, PaginatedResponse } from './useRealData';
import { Response } from './useRealData';

export interface ResponseFilters {
  responseType?: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  assessmentId?: string;
  responderId?: string;
  donorId?: string;
  affectedEntityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  syncStatus?: 'SYNCED' | 'PENDING' | 'FAILED';
  hasBudgetOverruns?: boolean;
  isDelayed?: boolean;
}

export interface ResponseStats {
  totalResponses: number;
  byResponseType: Record<string, number>;
  byStatus: Record<string, number>;
  totalBudget: number;
  actualSpent: number;
  budgetUtilization: number; // percentage
  delayedResponses: number;
  onTimeResponses: number;
  averageCompletionTime: number; // in days
}

export interface UseResponsesOptions extends UseRealDataOptions<PaginatedResponse<Response>> {
  filters?: ResponseFilters;
}

export interface UseResponsesReturn {
  responses: Response[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<PaginatedResponse<Response> | undefined>;
  refresh: () => Promise<PaginatedResponse<Response> | undefined>;
  isValidating: boolean;
  // Utility functions
  getResponsesByType: (type: string) => Response[];
  getResponsesByStatus: (status: string) => Response[];
  getActiveResponses: () => Response[];
  getDelayedResponses: () => Response[];
  getOverBudgetResponses: () => Response[];
  getResponsesByAssessment: (assessmentId: string) => Response[];
  getResponsesByDonor: (donorId: string) => Response[];
  searchResponses: (query: string) => Response[];
}

export function useResponses(options: UseResponsesOptions = {}): UseResponsesReturn {
  const { filters = {}, ...realDataOptions } = options;

  const fetchResponses = useCallback(async (params: any = {}) => {
    const apiParams = {
      ...params,
      ...filters,
      // Convert Date objects to ISO strings for API
      dateFrom: filters.dateFrom?.toISOString(),
      dateTo: filters.dateTo?.toISOString(),
    };

    return fetchAPI<PaginatedResponse<Response>>('/api/v1/responses', apiParams);
  }, [filters]);

  const { data, isLoading, error, mutate, refresh, isValidating } = useRealData(
    'responses',
    fetchResponses,
    realDataOptions
  );

  const responses = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    pageSize: 20,
    totalPages: 0,
    totalCount: 0,
  };

  // Utility functions
  const getResponsesByType = useCallback((type: string) => {
    return responses.filter(response => response.responseType === type);
  }, [responses]);

  const getResponsesByStatus = useCallback((status: string) => {
    return responses.filter(response => response.status === status);
  }, [responses]);

  const getActiveResponses = useCallback(() => {
    return responses.filter(response => response.status === 'ACTIVE');
  }, [responses]);

  const getDelayedResponses = useCallback(() => {
    const now = new Date();
    return responses.filter(response => 
      response.targetDate < now && 
      response.status !== 'COMPLETED' && 
      response.status !== 'CANCELLED'
    );
  }, [responses]);

  const getOverBudgetResponses = useCallback(() => {
    return responses.filter(response => 
      response.actualBudget && response.estimatedBudget && 
      response.actualBudget > response.estimatedBudget
    );
  }, [responses]);

  const getResponsesByAssessment = useCallback((assessmentId: string) => {
    return responses.filter(response => response.assessmentId === assessmentId);
  }, [responses]);

  const getResponsesByDonor = useCallback((donorId: string) => {
    return responses.filter(response => response.donorId === donorId);
  }, [responses]);

  const searchResponses = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return responses.filter(response =>
      response.responderName?.toLowerCase().includes(lowercaseQuery) ||
      response.donorName?.toLowerCase().includes(lowercaseQuery) ||
      response.affectedEntityName.toLowerCase().includes(lowercaseQuery) ||
      response.responseType.toLowerCase().includes(lowercaseQuery)
    );
  }, [responses]);

  return {
    responses,
    pagination,
    isLoading,
    error,
    mutate,
    refresh,
    isValidating,
    getResponsesByType,
    getResponsesByStatus,
    getActiveResponses,
    getDelayedResponses,
    getOverBudgetResponses,
    getResponsesByAssessment,
    getResponsesByDonor,
    searchResponses,
  };
}

// Hook for response statistics
export function useResponseStats(options: UseRealDataOptions<ResponseStats> = {}) {
  const fetchResponseStats = useCallback(async () => {
    return fetchAPI<ResponseStats>('/api/v1/responses/stats');
  }, []);

  return useRealData(
    'response-stats',
    fetchResponseStats,
    {
      refreshInterval: 60000, // Refresh every minute
      autoRefresh: true,
      ...options,
    }
  );
}

// Hook for single response with detailed information
export function useResponseDetail(
  id: string,
  options: UseRealDataOptions<Response & {
    assessment: {
      id: string;
      type: string;
      status: string;
    };
    affectedEntity: {
      id: string;
      name: string;
      type: string;
      location?: {
        latitude: number;
        longitude: number;
      };
    };
    activities: Array<{
      id: string;
      activityType: string;
      description: string;
      status: string;
      plannedDate: Date;
      completedDate?: Date;
      budget: number;
    }>;
    budgetBreakdown: Array<{
      category: string;
      planned: number;
      actual: number;
      variance: number;
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
  const fetchResponseDetail = useCallback(async () => {
    return fetchAPI(`/api/v1/responses/${id}`);
  }, [id]);

  return useRealData(
    id ? `response-detail-${id}` : null,
    fetchResponseDetail,
    options
  );
}

// Hook for response creation
export function useCreateResponse() {
  const createResponse = useCallback(async (responseData: {
    assessmentId: string;
    responseType: string;
    targetDate: Date;
    estimatedBudget: number;
    activities?: Array<{
      activityType: string;
      description: string;
      plannedDate: Date;
      budget: number;
    }>;
    donorId?: string;
    responderId?: string;
  }) => {
    return fetchAPI('/api/v1/responses', responseData, {
      method: 'POST',
    });
  }, []);

  return { createResponse };
}

// Hook for response updates
export function useUpdateResponse() {
  const updateResponse = useCallback(async (params: {
    responseId: string;
    status?: string;
    targetDate?: Date;
    actualDate?: Date;
    estimatedBudget?: number;
    actualBudget?: number;
    activities?: Array<{
      id?: string;
      activityType: string;
      description: string;
      status: string;
      plannedDate: Date;
      completedDate?: Date;
      budget: number;
    }>;
  }) => {
    return fetchAPI(`/api/v1/responses/${params.responseId}`, params, {
      method: 'PUT',
    });
  }, []);

  return { updateResponse };
}

// Hook for response activities
export function useResponseActivities(
  responseId: string,
  options: UseRealDataOptions<Array<{
    id: string;
    activityType: string;
    description: string;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
    plannedDate: Date;
    completedDate?: Date;
    budget: number;
    actualCost?: number;
    assignedTo?: string;
    notes?: string;
  }>> = {}
) {
  const fetchResponseActivities = useCallback(async () => {
    return fetchAPI(`/api/v1/responses/${responseId}/activities`);
  }, [responseId]);

  return useRealData(
    responseId ? `response-activities-${responseId}` : null,
    fetchResponseActivities,
    options
  );
}

// Hook for response budget tracking
export function useResponseBudget(
  responseId: string,
  options: UseRealDataOptions<{
    totalBudget: number;
    spentBudget: number;
    remainingBudget: number;
    budgetUtilization: number;
    categories: Array<{
      category: string;
      planned: number;
      actual: number;
      variance: number;
      percentage: number;
    }>;
    forecast: {
      projectedTotal: number;
      projectedOverrun: number;
      confidence: number;
    };
  }> = {}
) {
  const fetchResponseBudget = useCallback(async () => {
    return fetchAPI(`/api/v1/responses/${responseId}/budget`);
  }, [responseId]);

  return useRealData(
    responseId ? `response-budget-${responseId}` : null,
    fetchResponseBudget,
    options
  );
}

// Hook for response workflow
export function useResponseWorkflow(responseId: string) {
  const startResponse = useCallback(async () => {
    return fetchAPI(`/api/v1/responses/${responseId}/start`, {}, {
      method: 'POST',
    });
  }, [responseId]);

  const completeResponse = useCallback(async (actualBudget?: number) => {
    return fetchAPI(`/api/v1/responses/${responseId}/complete`, { actualBudget }, {
      method: 'POST',
    });
  }, [responseId]);

  const cancelResponse = useCallback(async (reason: string) => {
    return fetchAPI(`/api/v1/responses/${responseId}/cancel`, { reason }, {
      method: 'POST',
    });
  }, [responseId]);

  const pauseResponse = useCallback(async (reason: string) => {
    return fetchAPI(`/api/v1/responses/${responseId}/pause`, { reason }, {
      method: 'POST',
    });
  }, [responseId]);

  const resumeResponse = useCallback(async () => {
    return fetchAPI(`/api/v1/responses/${responseId}/resume`, {}, {
      method: 'POST',
    });
  }, [responseId]);

  return {
    startResponse,
    completeResponse,
    cancelResponse,
    pauseResponse,
    resumeResponse,
  };
}

// Hook for responses by entity
export function useEntityResponses(
  entityId: string,
  options: UseRealDataOptions<PaginatedResponse<Response>> = {}
) {
  const fetchEntityResponses = useCallback(async (params: any = {}) => {
    return fetchAPI<PaginatedResponse<Response>>(
      `/api/v1/entities/${entityId}/responses`,
      params
    );
  }, [entityId]);

  return useRealData(
    entityId ? `entity-responses-${entityId}` : null,
    fetchEntityResponses,
    options
  );
}