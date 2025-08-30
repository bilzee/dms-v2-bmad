'use client';

import { useState, useEffect, useCallback } from 'react';

interface IncidentSummary {
  id: string;
  name: string;
  type: 'FLOOD' | 'FIRE' | 'LANDSLIDE' | 'CYCLONE' | 'CONFLICT' | 'EPIDEMIC' | 'OTHER';
  severity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  date: Date;
  assessmentCount: number;
  responseCount: number;
  gapScore: number; // 0-100 percentage of needs fulfilled
  lastUpdate: Date;
}

interface IncidentOverviewFilters {
  status?: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  severity?: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
  sortBy?: 'date' | 'severity' | 'gapScore' | 'assessmentCount';
  sortOrder?: 'asc' | 'desc';
}

interface IncidentOverviewOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  filters?: IncidentOverviewFilters;
  onError?: (error: string) => void;
}

export const useIncidentOverview = (options: IncidentOverviewOptions = {}) => {
  const {
    refreshInterval = 25000,
    autoRefresh = true,
    filters = {},
    onError
  } = options;

  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [metadata, setMetadata] = useState({
    totalActive: 0,
    totalContained: 0,
    totalResolved: 0,
    criticalCount: 0,
    totalIncidents: 0,
  });

  const fetchIncidents = useCallback(async () => {
    try {
      setError(null);
      const searchParams = new URLSearchParams();
      
      if (filters.status) searchParams.append('status', filters.status);
      if (filters.severity) searchParams.append('severity', filters.severity);
      if (filters.sortBy) searchParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) searchParams.append('sortOrder', filters.sortOrder);
      
      const response = await fetch(`/api/v1/monitoring/situation/incidents?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setIncidents(data.data.map((incident: any) => ({
          ...incident,
          date: new Date(incident.date),
          lastUpdate: new Date(incident.lastUpdate),
        })));
        
        setMetadata({
          totalActive: data.meta.totalActive,
          totalContained: data.meta.totalContained,
          totalResolved: data.meta.totalResolved,
          criticalCount: data.meta.criticalCount,
          totalIncidents: data.meta.totalIncidents,
        });
        
        setLastUpdated(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch incident overview');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch incident overview';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filters, onError]);

  useEffect(() => {
    fetchIncidents();
    
    if (autoRefresh) {
      const interval = setInterval(fetchIncidents, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchIncidents, refreshInterval, autoRefresh]);

  const getActiveIncidents = useCallback(() => {
    return incidents.filter(incident => incident.status === 'ACTIVE');
  }, [incidents]);

  const getCriticalIncidents = useCallback(() => {
    return incidents.filter(incident => 
      incident.severity === 'CATASTROPHIC' || incident.severity === 'SEVERE'
    );
  }, [incidents]);

  const getIncidentsByType = useCallback((type: IncidentSummary['type']) => {
    return incidents.filter(incident => incident.type === type);
  }, [incidents]);

  const getIncidentsWithLowCoverage = useCallback((threshold: number = 50) => {
    return incidents.filter(incident => incident.gapScore < threshold);
  }, [incidents]);

  const getAverageGapScore = useCallback(() => {
    if (incidents.length === 0) return 0;
    const totalGapScore = incidents.reduce((sum, incident) => sum + incident.gapScore, 0);
    return Math.round(totalGapScore / incidents.length);
  }, [incidents]);

  const getRecentlyUpdatedIncidents = useCallback((hoursThreshold: number = 24) => {
    const cutoffTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
    return incidents.filter(incident => incident.lastUpdate > cutoffTime);
  }, [incidents]);

  return {
    incidents,
    metadata,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchIncidents,
    getActiveIncidents,
    getCriticalIncidents,
    getIncidentsByType,
    getIncidentsWithLowCoverage,
    getAverageGapScore,
    getRecentlyUpdatedIncidents,
  };
};