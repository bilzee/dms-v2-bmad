// hooks/useMonitoringData.ts

import { useEffect, useCallback } from 'react';
import { useMonitoringStore, useMonitoringStatus } from '@/stores/monitoring.store';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook for managing system monitoring data with auto-refresh
 */
export function useMonitoringData() {
  const { toast } = useToast();
  
  const {
    currentMetrics,
    historicalData,
    alerts,
    healthStatus,
    isLoading,
    lastRefresh,
    error,
    settings,
    loadFullMonitoringData,
    loadCurrentMetrics,
    loadHistoricalData,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    toggleAutoRefresh,
    setSettings,
    dismissAlert,
    acknowledgeAlert,
    reset,
  } = useMonitoringStore();

  const status = useMonitoringStatus();

  // Initialize monitoring on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await loadFullMonitoringData(true);
        
        // Start auto-refresh if enabled
        if (settings.autoRefreshEnabled) {
          startAutoRefresh();
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load monitoring data',
          variant: 'destructive'
        });
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      stopAutoRefresh();
    };
  }, [loadFullMonitoringData, settings.autoRefreshEnabled, startAutoRefresh, stopAutoRefresh, toast]);

  // Show error toast when error state changes
  useEffect(() => {
    if (error) {
      toast({
        title: 'Monitoring Error',
        description: error,
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  // Manual refresh with user feedback
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      toast({
        title: 'Refreshed',
        description: 'System monitoring data has been refreshed',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh monitoring data',
        variant: 'destructive'
      });
    }
  }, [refresh, toast]);

  // Load only current metrics (faster refresh)
  const quickRefresh = useCallback(async () => {
    try {
      await loadCurrentMetrics();
    } catch (error) {
      console.error('Quick refresh failed:', error);
    }
  }, [loadCurrentMetrics]);

  // Load historical data for a specific time range
  const loadHistoricalRange = useCallback(async (hours: number) => {
    try {
      await loadHistoricalData(hours);
      toast({
        title: 'Historical Data Loaded',
        description: `Loaded ${hours} hours of historical data`,
      });
    } catch (error) {
      toast({
        title: 'Load Failed',
        description: 'Failed to load historical data',
        variant: 'destructive'
      });
    }
  }, [loadHistoricalData, toast]);

  // Update auto-refresh settings
  const updateAutoRefresh = useCallback((enabled: boolean, interval?: number) => {
    const newSettings: any = { autoRefreshEnabled: enabled };
    if (interval !== undefined) {
      newSettings.autoRefreshInterval = interval;
    }
    
    setSettings(newSettings);
    
    if (enabled) {
      startAutoRefresh();
      toast({
        title: 'Auto-refresh Enabled',
        description: `Data will refresh every ${interval || settings.autoRefreshInterval} seconds`,
      });
    } else {
      stopAutoRefresh();
      toast({
        title: 'Auto-refresh Disabled',
        description: 'Automatic data refresh has been stopped',
      });
    }
  }, [setSettings, startAutoRefresh, stopAutoRefresh, settings.autoRefreshInterval, toast]);

  // Update alert thresholds
  const updateAlertThresholds = useCallback((thresholds: Partial<typeof settings.alertThresholds>) => {
    setSettings({
      alertThresholds: { ...settings.alertThresholds, ...thresholds }
    });
    toast({
      title: 'Thresholds Updated',
      description: 'Alert thresholds have been updated',
    });
  }, [setSettings, settings.alertThresholds, toast]);

  // Handle alert actions with user feedback
  const handleDismissAlert = useCallback((alertId: string) => {
    dismissAlert(alertId);
    toast({
      title: 'Alert Dismissed',
      description: 'Alert has been dismissed',
    });
  }, [dismissAlert, toast]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    acknowledgeAlert(alertId);
    toast({
      title: 'Alert Acknowledged',
      description: 'Alert has been acknowledged',
    });
  }, [acknowledgeAlert, toast]);

  // Get aggregated metrics for dashboard cards
  const getMetricsSummary = useCallback(() => {
    if (!currentMetrics) return null;

    return {
      database: {
        connectionCount: currentMetrics.database?.connectionCount,
        avgQueryTime: currentMetrics.database?.avgQueryTime,
        isHealthy: (currentMetrics.database?.avgQueryTime ?? 999) < 100 && (currentMetrics.database?.errorRate ?? 100) < 2
      },
      api: {
        requestsPerMinute: currentMetrics.api?.requestsPerMinute,
        avgResponseTime: currentMetrics.api?.avgResponseTime,
        errorRate: currentMetrics.api?.errorRate,
        isHealthy: (currentMetrics.api?.errorRate ?? 100) < 5 && (currentMetrics.api?.avgResponseTime ?? 9999) < 1000
      },
      queue: {
        totalJobs: (currentMetrics.queue?.activeJobs ?? 0) + (currentMetrics.queue?.waitingJobs ?? 0),
        activeJobs: currentMetrics.queue?.activeJobs,
        waitingJobs: currentMetrics.queue?.waitingJobs,
        processingRate: currentMetrics.queue?.processingRate,
        isHealthy: (currentMetrics.queue?.waitingJobs ?? 999) < 50 && (currentMetrics.queue?.errorRate ?? 100) < 5
      },
      system: {
        cpuUsage: currentMetrics.system?.cpuUsage,
        memoryUsage: currentMetrics.system?.memoryUsage,
        diskUsage: currentMetrics.system?.diskUsage,
        networkLatency: currentMetrics.system?.networkLatency,
        isHealthy: (currentMetrics.system?.cpuUsage ?? 100) < 80 && (currentMetrics.system?.memoryUsage ?? 100) < 85
      },
      sync: {
        successRate: currentMetrics.sync?.successRate,
        conflictRate: currentMetrics.sync?.conflictRate,
        avgSyncTime: currentMetrics.sync?.avgSyncTime,
        pendingItems: currentMetrics.sync?.pendingItems,
        lastSyncAt: currentMetrics.sync?.lastSyncAt,
        isHealthy: (currentMetrics.sync?.successRate ?? 0) > 95 && (currentMetrics.sync?.conflictRate ?? 100) < 5
      }
    };
  }, [currentMetrics]);

  // Get performance trends from historical data
  const getPerformanceTrends = useCallback(() => {
    if (historicalData.length < 2) return null;

    const latest = historicalData[0];
    const previous = historicalData[1];

    return {
      cpu: {
        current: latest.system?.cpuUsage,
        change: (latest.system?.cpuUsage ?? 0) - (previous.system?.cpuUsage ?? 0),
        trend: (latest.system?.cpuUsage ?? 0) > (previous.system?.cpuUsage ?? 0) ? 'up' : 'down'
      },
      memory: {
        current: latest.system?.memoryUsage,
        change: (latest.system?.memoryUsage ?? 0) - (previous.system?.memoryUsage ?? 0),
        trend: (latest.system?.memoryUsage ?? 0) > (previous.system?.memoryUsage ?? 0) ? 'up' : 'down'
      },
      responseTime: {
        current: latest.api?.avgResponseTime,
        change: (latest.api?.avgResponseTime ?? 0) - (previous.api?.avgResponseTime ?? 0),
        trend: (latest.api?.avgResponseTime ?? 0) > (previous.api?.avgResponseTime ?? 0) ? 'up' : 'down'
      },
      errorRate: {
        current: latest.api?.errorRate,
        change: (latest.api?.errorRate ?? 0) - (previous.api?.errorRate ?? 0),
        trend: (latest.api?.errorRate ?? 0) > (previous.api?.errorRate ?? 0) ? 'up' : 'down'
      }
    };
  }, [historicalData]);

  return {
    // Current State
    currentMetrics,
    historicalData,
    alerts,
    healthStatus,
    isLoading,
    lastRefresh,
    error,
    settings,
    
    // Computed Status
    status,
    metricsSummary: getMetricsSummary(),
    performanceTrends: getPerformanceTrends(),
    
    // Data Actions
    refresh: handleRefresh,
    quickRefresh,
    loadHistoricalRange,
    
    // Settings Actions
    updateAutoRefresh,
    toggleAutoRefresh,
    updateAlertThresholds,
    
    // Alert Actions
    dismissAlert: handleDismissAlert,
    acknowledgeAlert: handleAcknowledgeAlert,
    
    // Utility
    reset,
  };
}

/**
 * Hook for monitoring system health status
 */
export function useSystemHealth() {
  const status = useMonitoringStatus();
  const { currentMetrics, settings } = useMonitoringStore();

  // Check if specific metrics exceed thresholds
  const checkThresholds = useCallback(() => {
    if (!currentMetrics) return {};

    const { alertThresholds } = settings;

    return {
      cpu: {
        value: currentMetrics.system?.cpuUsage,
        threshold: alertThresholds.cpu,
        exceeded: (currentMetrics.system?.cpuUsage ?? 0) > alertThresholds.cpu
      },
      memory: {
        value: currentMetrics.system?.memoryUsage,
        threshold: alertThresholds.memory,
        exceeded: (currentMetrics.system?.memoryUsage ?? 0) > alertThresholds.memory
      },
      disk: {
        value: currentMetrics.system?.diskUsage,
        threshold: alertThresholds.disk,
        exceeded: (currentMetrics.system?.diskUsage ?? 0) > alertThresholds.disk
      },
      apiErrorRate: {
        value: currentMetrics.api?.errorRate,
        threshold: alertThresholds.apiErrorRate,
        exceeded: (currentMetrics.api?.errorRate ?? 0) > alertThresholds.apiErrorRate
      },
      responseTime: {
        value: currentMetrics.api?.avgResponseTime,
        threshold: alertThresholds.responseTime,
        exceeded: (currentMetrics.api?.avgResponseTime ?? 0) > alertThresholds.responseTime
      },
      queueSize: {
        value: currentMetrics.queue?.waitingJobs,
        threshold: alertThresholds.queueSize,
        exceeded: (currentMetrics.queue?.waitingJobs ?? 0) > alertThresholds.queueSize
      }
    };
  }, [currentMetrics, settings]);

  return {
    ...status,
    thresholds: checkThresholds(),
  };
}