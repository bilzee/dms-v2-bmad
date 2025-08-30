'use client';

import { useState, useEffect, useCallback } from 'react';

interface SituationOverview {
  timestamp: Date;
  totalAssessments: number;
  totalResponses: number;
  pendingVerification: number;
  activeIncidents: number;
  criticalGaps: number;
  dataFreshness: {
    realTime: number;
    recent: number;
    offlinePending: number;
  };
}

interface SituationMonitoringOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  onError?: (error: string) => void;
  onConnectionChange?: (status: 'connected' | 'degraded' | 'offline') => void;
}

export const useSituationMonitoring = (options: SituationMonitoringOptions = {}) => {
  const {
    refreshInterval = 25000,
    autoRefresh = true,
    onError,
    onConnectionChange
  } = options;

  const [situationData, setSituationData] = useState<SituationOverview | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'degraded' | 'offline'>('connected');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchSituationData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/v1/monitoring/situation/overview');
      const data = await response.json();
      
      if (data.success) {
        setSituationData({
          ...data.data,
          timestamp: new Date(data.data.timestamp),
        });
        
        const newConnectionStatus = data.meta.connectionStatus;
        if (newConnectionStatus !== connectionStatus) {
          setConnectionStatus(newConnectionStatus);
          onConnectionChange?.(newConnectionStatus);
        }
        
        setLastUpdated(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch situation data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch situation data';
      setError(errorMessage);
      setConnectionStatus('offline');
      onError?.(errorMessage);
      onConnectionChange?.('offline');
    } finally {
      setIsLoading(false);
    }
  }, [connectionStatus, onError, onConnectionChange]);

  useEffect(() => {
    fetchSituationData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSituationData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSituationData, refreshInterval, autoRefresh]);

  const getResponseRate = useCallback(() => {
    if (!situationData || situationData.totalAssessments === 0) return 0;
    return Math.round((situationData.totalResponses / situationData.totalAssessments) * 100);
  }, [situationData]);

  const getDataFreshnessPercentage = useCallback((category: keyof SituationOverview['dataFreshness']) => {
    if (!situationData) return 0;
    const total = situationData.dataFreshness.realTime + 
                  situationData.dataFreshness.recent + 
                  situationData.dataFreshness.offlinePending;
    return total > 0 ? Math.round((situationData.dataFreshness[category] / total) * 100) : 0;
  }, [situationData]);

  const getDataFreshnessStatus = useCallback(() => {
    if (!situationData) return 'UNKNOWN';
    
    const realTimePercentage = getDataFreshnessPercentage('realTime');
    
    if (realTimePercentage >= 90) return 'EXCELLENT';
    if (realTimePercentage >= 70) return 'GOOD';
    if (realTimePercentage >= 50) return 'FAIR';
    return 'POOR';
  }, [situationData, getDataFreshnessPercentage]);

  return {
    situationData,
    connectionStatus,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchSituationData,
    getResponseRate,
    getDataFreshnessPercentage,
    getDataFreshnessStatus,
  };
};