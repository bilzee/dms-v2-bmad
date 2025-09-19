'use client';

import { useCallback } from 'react';
import { useRealData, fetchAPI, UseRealDataOptions, PaginatedResponse } from './useRealData';
import { Assessment } from './useRealData';

export interface AssessmentFilters {
  type?: 'PRELIMINARY' | 'RAPID' | 'HEALTH' | 'POPULATION' | 'FOOD' | 'SHELTER' | 'SECURITY';
  status?: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  incidentId?: string;
  assessorId?: string;
  affectedEntityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  syncStatus?: 'SYNCED' | 'PENDING' | 'FAILED';
}

export interface AssessmentStats {
  totalAssessments: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byVerificationStatus: Record<string, number>;
  pendingVerification: number;
  recentlyCompleted: number;
  averageCompletionTime: number; // in hours
}

export interface UseAssessmentsOptions extends UseRealDataOptions<PaginatedResponse<Assessment>> {
  filters?: AssessmentFilters;
}

export interface UseAssessmentsReturn {
  assessments: Assessment[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<PaginatedResponse<Assessment> | undefined>;
  refresh: () => Promise<PaginatedResponse<Assessment> | undefined>;
  isValidating: boolean;
  // Utility functions
  getAssessmentsByType: (type: string) => Assessment[];
  getAssessmentsByStatus: (status: string) => Assessment[];
  getPendingVerification: () => Assessment[];
  getRecentAssessments: (hours?: number) => Assessment[];
  searchAssessments: (query: string) => Assessment[];
  getAssessmentsByIncident: (incidentId: string) => Assessment[];
}

export function useAssessments(options: UseAssessmentsOptions = {}): UseAssessmentsReturn {
  const { filters = {}, ...realDataOptions } = options;

  const fetchAssessments = useCallback(async (params: any = {}) => {
    const apiParams = {
      ...params,
      ...filters,
      // Convert Date objects to ISO strings for API
      dateFrom: filters.dateFrom?.toISOString(),
      dateTo: filters.dateTo?.toISOString(),
    };

    return fetchAPI<PaginatedResponse<Assessment>>('/api/v1/assessments', apiParams);
  }, [filters]);

  const { data, isLoading, error, mutate, refresh, isValidating } = useRealData(
    'assessments',
    fetchAssessments,
    realDataOptions
  );

  const assessments = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    pageSize: 20,
    totalPages: 0,
    totalCount: 0,
  };

  // Utility functions
  const getAssessmentsByType = useCallback((type: string) => {
    return assessments.filter(assessment => assessment.type === type);
  }, [assessments]);

  const getAssessmentsByStatus = useCallback((status: string) => {
    return assessments.filter(assessment => assessment.status === status);
  }, [assessments]);

  const getPendingVerification = useCallback(() => {
    return assessments.filter(assessment => assessment.verificationStatus === 'PENDING');
  }, [assessments]);

  const getRecentAssessments = useCallback((hours = 24) => {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return assessments.filter(assessment => assessment.assessmentDate > cutoffTime);
  }, [assessments]);

  const searchAssessments = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return assessments.filter(assessment =>
      assessment.assessorName.toLowerCase().includes(lowercaseQuery) ||
      assessment.affectedEntityName.toLowerCase().includes(lowercaseQuery) ||
      assessment.incidentName?.toLowerCase().includes(lowercaseQuery) ||
      assessment.type.toLowerCase().includes(lowercaseQuery)
    );
  }, [assessments]);

  const getAssessmentsByIncident = useCallback((incidentId: string) => {
    return assessments.filter(assessment => assessment.incidentId === incidentId);
  }, [assessments]);

  return {
    assessments,
    pagination,
    isLoading,
    error,
    mutate,
    refresh,
    isValidating,
    getAssessmentsByType,
    getAssessmentsByStatus,
    getPendingVerification,
    getRecentAssessments,
    searchAssessments,
    getAssessmentsByIncident,
  };
}

// Hook for assessment statistics
export function useAssessmentStats(options: UseRealDataOptions<AssessmentStats> = {}) {
  const fetchAssessmentStats = useCallback(async () => {
    return fetchAPI<AssessmentStats>('/api/v1/assessments/stats');
  }, []);

  return useRealData(
    'assessment-stats',
    fetchAssessmentStats,
    {
      refreshInterval: 60000, // Refresh every minute
      autoRefresh: true,
      ...options,
    }
  );
}

// Hook for single assessment with detailed information
export function useAssessmentDetail(
  id: string,
  options: UseRealDataOptions<Assessment & {
    incident?: {
      id: string;
      name: string;
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
    responses: Array<{
      id: string;
      responseType: string;
      status: string;
      responderName?: string;
      donorName?: string;
      targetDate: Date;
    }>;
    verificationHistory: Array<{
      id: string;
      status: string;
      verifierName: string;
      verifiedAt: Date;
      comments?: string;
    }>;
    formData: Record<string, any>;
  }> = {}
) {
  const fetchAssessmentDetail = useCallback(async (): Promise<Assessment & {
    incident?: {
      id: string;
      name: string;
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
    responses: Array<{
      id: string;
      responseType: string;
      status: string;
      responderName?: string;
      donorName?: string;
      targetDate: Date;
    }>;
    verificationHistory: Array<{
      id: string;
      status: string;
      verifierName: string;
      verifiedAt: Date;
      comments?: string;
    }>;
    formData: Record<string, any>;
  }> => {
    return fetchAPI(`/api/v1/assessments/${id}`) as any;
  }, [id]);

  return useRealData(
    id ? `assessment-detail-${id}` : null,
    fetchAssessmentDetail,
    options
  );
}

// Hook for assessment creation
export function useCreateAssessment() {
  const createAssessment = useCallback(async (assessmentData: {
    type: string;
    incidentId?: string;
    affectedEntityId: string;
    assessmentDate: Date;
    formData: Record<string, any>;
    estimatedNeeds?: Record<string, any>;
  }) => {
    return fetchAPI('/api/v1/assessments', assessmentData, {
      method: 'POST',
    });
  }, []);

  return { createAssessment };
}

// Hook for assessment updates
export function useUpdateAssessment() {
  const updateAssessment = useCallback(async (params: {
    assessmentId: string;
    status?: string;
    verificationStatus?: string;
    formData?: Record<string, any>;
    estimatedNeeds?: Record<string, any>;
  }) => {
    return fetchAPI(`/api/v1/assessments/${params.assessmentId}`, params, {
      method: 'PUT',
    });
  }, []);

  return { updateAssessment };
}

// Hook for assessment verification
export function useVerifyAssessment() {
  const verifyAssessment = useCallback(async (params: {
    assessmentId: string;
    status: 'VERIFIED' | 'REJECTED';
    comments?: string;
    verificationData?: Record<string, any>;
  }) => {
    return fetchAPI(`/api/v1/assessments/${params.assessmentId}/verify`, params, {
      method: 'POST',
    });
  }, []);

  return { verifyAssessment };
}

// Hook for assessments by entity
export function useEntityAssessments(
  entityId: string,
  options: UseRealDataOptions<PaginatedResponse<Assessment>> = {}
) {
  const fetchEntityAssessments = useCallback(async (params: any = {}) => {
    return fetchAPI<PaginatedResponse<Assessment>>(
      `/api/v1/entities/${entityId}/assessments`,
      params
    );
  }, [entityId]);

  return useRealData(
    entityId ? `entity-assessments-${entityId}` : null,
    fetchEntityAssessments,
    options
  );
}

// Hook for assessment workflow
export function useAssessmentWorkflow(assessmentId: string) {
  const submitForReview = useCallback(async () => {
    return fetchAPI(`/api/v1/assessments/${assessmentId}/submit`, {}, {
      method: 'POST',
    });
  }, [assessmentId]);

  const approveAssessment = useCallback(async (comments?: string) => {
    return fetchAPI(`/api/v1/assessments/${assessmentId}/approve`, { comments }, {
      method: 'POST',
    });
  }, [assessmentId]);

  const rejectAssessment = useCallback(async (reason: string) => {
    return fetchAPI(`/api/v1/assessments/${assessmentId}/reject`, { reason }, {
      method: 'POST',
    });
  }, [assessmentId]);

  return {
    submitForReview,
    approveAssessment,
    rejectAssessment,
  };
}