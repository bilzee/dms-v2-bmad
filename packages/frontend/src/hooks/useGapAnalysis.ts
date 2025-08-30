'use client';

import { useState, useEffect, useCallback } from 'react';

interface GapAnalysis {
  assessmentType: 'HEALTH' | 'WASH' | 'SHELTER' | 'FOOD' | 'SECURITY';
  totalNeeds: number;
  totalResponses: number;
  fulfillmentRate: number; // 0-100 percentage
  criticalGaps: number;
  affectedEntities: number;
  lastAssessment: Date;
  lastResponse?: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface GapAnalysisFilters {
  assessmentType?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threshold?: number; // Fulfillment rate threshold
}

interface GapAnalysisOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  filters?: GapAnalysisFilters;
  onError?: (error: string) => void;
}

export const useGapAnalysis = (options: GapAnalysisOptions = {}) => {
  const {
    refreshInterval = 25000,
    autoRefresh = true,
    filters = {},
    onError
  } = options;

  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [overallFulfillmentRate, setOverallFulfillmentRate] = useState(0);
  const [criticalGapsCount, setCriticalGapsCount] = useState(0);
  const [totalCriticalGaps, setTotalCriticalGaps] = useState(0);

  const fetchGapAnalysis = useCallback(async () => {
    try {
      setError(null);
      const searchParams = new URLSearchParams();
      
      if (filters.assessmentType) searchParams.append('assessmentType', filters.assessmentType);
      if (filters.priority) searchParams.append('priority', filters.priority);
      if (filters.threshold) searchParams.append('threshold', filters.threshold.toString());
      
      const response = await fetch(`/api/v1/monitoring/situation/gap-analysis?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setGapAnalysis(data.data.map((gap: any) => ({
          ...gap,
          lastAssessment: new Date(gap.lastAssessment),
          lastResponse: gap.lastResponse ? new Date(gap.lastResponse) : undefined,
        })));
        
        setOverallFulfillmentRate(data.meta.overallFulfillmentRate);
        setCriticalGapsCount(data.meta.criticalGapsCount);
        setTotalCriticalGaps(data.meta.totalCriticalGaps);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch gap analysis');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch gap analysis';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filters, onError]);

  useEffect(() => {
    fetchGapAnalysis();
    
    if (autoRefresh) {
      const interval = setInterval(fetchGapAnalysis, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchGapAnalysis, refreshInterval, autoRefresh]);

  const getCriticalGaps = useCallback(() => {
    return gapAnalysis.filter(gap => gap.priority === 'CRITICAL');
  }, [gapAnalysis]);

  const getHighPriorityGaps = useCallback(() => {
    return gapAnalysis.filter(gap => gap.priority === 'HIGH' || gap.priority === 'CRITICAL');
  }, [gapAnalysis]);

  const getGapsByAssessmentType = useCallback((type: GapAnalysis['assessmentType']) => {
    return gapAnalysis.find(gap => gap.assessmentType === type);
  }, [gapAnalysis]);

  const getWorstPerformingTypes = useCallback((limit: number = 3) => {
    return [...gapAnalysis]
      .sort((a, b) => a.fulfillmentRate - b.fulfillmentRate)
      .slice(0, limit);
  }, [gapAnalysis]);

  const getBestPerformingTypes = useCallback((limit: number = 3) => {
    return [...gapAnalysis]
      .sort((a, b) => b.fulfillmentRate - a.fulfillmentRate)
      .slice(0, limit);
  }, [gapAnalysis]);

  return {
    gapAnalysis,
    isLoading,
    error,
    lastUpdated,
    overallFulfillmentRate,
    criticalGapsCount,
    totalCriticalGaps,
    refresh: fetchGapAnalysis,
    getCriticalGaps,
    getHighPriorityGaps,
    getGapsByAssessmentType,
    getWorstPerformingTypes,
    getBestPerformingTypes,
  };
};