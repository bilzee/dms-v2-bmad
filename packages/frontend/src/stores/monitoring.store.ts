// stores/monitoring.store.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  SystemPerformanceMetrics, 
  SystemPerformanceResponse
} from '@dms/shared/types/admin';

// Local type for alerts until added to shared types
interface SystemAlert {
  type: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
  acknowledged?: boolean;
  acknowledgedAt?: Date;
}

interface MonitoringSettings {
  autoRefreshInterval: number; // in seconds
  autoRefreshEnabled: boolean;
  alertThresholds: {
    cpu: number;
    memory: number;
    disk: number;
    apiErrorRate: number;
    responseTime: number;
    queueSize: number;
  };
  historicalDataRange: number; // in hours
}

interface MonitoringStore {
  // Current State
  currentMetrics: SystemPerformanceMetrics | null;
  historicalData: SystemPerformanceMetrics[];
  alerts: SystemAlert[];
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  isLoading: boolean;
  lastRefresh: Date | null;
  error: string | null;

  // Settings
  settings: MonitoringSettings;

  // Auto-refresh
  autoRefreshTimer: NodeJS.Timeout | null;

  // Actions
  setCurrentMetrics: (metrics: SystemPerformanceMetrics) => void;
  setHistoricalData: (data: SystemPerformanceMetrics[]) => void;
  setAlerts: (alerts: SystemAlert[]) => void;
  setHealthStatus: (status: 'HEALTHY' | 'WARNING' | 'CRITICAL') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSettings: (settings: Partial<MonitoringSettings>) => void;

  // Data Loading
  loadCurrentMetrics: () => Promise<void>;
  loadHistoricalData: (hours?: number) => Promise<void>;
  loadFullMonitoringData: (includeHistorical?: boolean) => Promise<void>;
  refresh: () => Promise<void>;

  // Auto-refresh Control
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  toggleAutoRefresh: () => void;

  // Alert Management
  dismissAlert: (alertId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  getActiveAlerts: () => SystemAlert[];
  getCriticalAlerts: () => SystemAlert[];
  getWarningAlerts: () => SystemAlert[];

  // Utility
  isHealthy: () => boolean;
  hasActiveAlerts: () => boolean;
  getSystemStatus: () => 'operational' | 'degraded' | 'down';
  reset: () => void;
}

const defaultSettings: MonitoringSettings = {
  autoRefreshInterval: 30,
  autoRefreshEnabled: true,
  alertThresholds: {
    cpu: 80,
    memory: 85,
    disk: 90,
    apiErrorRate: 5,
    responseTime: 1000,
    queueSize: 100,
  },
  historicalDataRange: 24,
};

const initialState = {
  currentMetrics: null,
  historicalData: [],
  alerts: [],
  healthStatus: 'HEALTHY' as const,
  isLoading: false,
  lastRefresh: null,
  error: null,
  settings: defaultSettings,
  autoRefreshTimer: null,
};

export const useMonitoringStore = create<MonitoringStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Basic Setters
        setCurrentMetrics: (metrics) => set({ currentMetrics: metrics }),
        setHistoricalData: (data) => set({ historicalData: data }),
        setAlerts: (alerts) => set({ alerts }),
        setHealthStatus: (status) => set({ healthStatus: status }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        
        setSettings: (newSettings) =>
          set((state) => ({
            settings: { ...state.settings, ...newSettings }
          })),

        // Data Loading
        loadCurrentMetrics: async () => {
          const { setLoading, setError, setCurrentMetrics } = get();
          
          try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/v1/admin/monitoring/performance?includeHistorical=false');
            const data: SystemPerformanceResponse = await response.json();

            if (data.success) {
              setCurrentMetrics(data.data.currentMetrics);
              set({ lastRefresh: new Date() });
            } else {
              throw new Error(data.message || 'Failed to load current metrics');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setError(errorMessage);
            console.error('Failed to load current metrics:', error);
          } finally {
            setLoading(false);
          }
        },

        loadHistoricalData: async (hours) => {
          const { settings, setError, setHistoricalData } = get();
          const hoursToLoad = hours || settings.historicalDataRange;

          try {
            const response = await fetch(`/api/v1/admin/monitoring/performance?includeHistorical=true&historicalHours=${hoursToLoad}&includeAlerts=false`);
            const data: SystemPerformanceResponse = await response.json();

            if (data.success && data.data.historicalData) {
              setHistoricalData(data.data.historicalData);
            } else {
              throw new Error(data.message || 'Failed to load historical data');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setError(errorMessage);
            console.error('Failed to load historical data:', error);
          }
        },

        loadFullMonitoringData: async (includeHistorical = true) => {
          const { settings, setLoading, setError, setCurrentMetrics, setHistoricalData, setAlerts, setHealthStatus } = get();
          
          try {
            setLoading(true);
            setError(null);

            const searchParams = new URLSearchParams({
              includeAlerts: 'true',
              includeHistorical: includeHistorical.toString(),
              historicalHours: settings.historicalDataRange.toString()
            });

            const response = await fetch(`/api/v1/admin/monitoring/performance?${searchParams}`);
            const data: SystemPerformanceResponse = await response.json();

            if (data.success) {
              setCurrentMetrics(data.data.currentMetrics);
              if (data.data.historicalData) {
                setHistoricalData(data.data.historicalData);
              }
              if (data.data.alerts) {
                setAlerts(data.data.alerts);
              }
              if (data.data.healthStatus) {
                setHealthStatus(data.data.healthStatus);
              }
              set({ lastRefresh: new Date() });
            } else {
              throw new Error(data.message || 'Failed to load monitoring data');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setError(errorMessage);
            console.error('Failed to load monitoring data:', error);
          } finally {
            setLoading(false);
          }
        },

        refresh: async () => {
          const { loadFullMonitoringData } = get();
          await loadFullMonitoringData(false); // Refresh current data only
        },

        // Auto-refresh Control
        startAutoRefresh: () => {
          const { settings, autoRefreshTimer, stopAutoRefresh, refresh } = get();
          
          // Clear existing timer if any
          if (autoRefreshTimer) {
            stopAutoRefresh();
          }

          if (settings.autoRefreshEnabled) {
            const timer = setInterval(() => {
              refresh();
            }, settings.autoRefreshInterval * 1000);

            set({ autoRefreshTimer: timer });
          }
        },

        stopAutoRefresh: () => {
          const { autoRefreshTimer } = get();
          
          if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            set({ autoRefreshTimer: null });
          }
        },

        toggleAutoRefresh: () => {
          const { settings, setSettings, startAutoRefresh, stopAutoRefresh } = get();
          const newEnabled = !settings.autoRefreshEnabled;
          
          setSettings({ autoRefreshEnabled: newEnabled });
          
          if (newEnabled) {
            startAutoRefresh();
          } else {
            stopAutoRefresh();
          }
        },

        // Alert Management
        dismissAlert: (alertId) => {
          const { alerts, setAlerts } = get();
          const updatedAlerts = alerts.filter(alert => alert.type !== alertId);
          setAlerts(updatedAlerts);
        },

        acknowledgeAlert: (alertId) => {
          const { alerts, setAlerts } = get();
          const updatedAlerts = alerts.map(alert => 
            alert.type === alertId 
              ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
              : alert
          );
          setAlerts(updatedAlerts);
        },

        getActiveAlerts: () => {
          const { alerts } = get();
          return alerts.filter(alert => !alert.acknowledged);
        },

        getCriticalAlerts: () => {
          const { alerts } = get();
          return alerts.filter(alert => alert.severity === 'CRITICAL' && !alert.acknowledged);
        },

        getWarningAlerts: () => {
          const { alerts } = get();
          return alerts.filter(alert => alert.severity === 'WARNING' && !alert.acknowledged);
        },

        // Utility Functions
        isHealthy: () => {
          const { healthStatus } = get();
          return healthStatus === 'HEALTHY';
        },

        hasActiveAlerts: () => {
          const { getActiveAlerts } = get();
          return getActiveAlerts().length > 0;
        },

        getSystemStatus: () => {
          const { healthStatus, currentMetrics } = get();
          
          if (!currentMetrics) return 'down';
          
          if (healthStatus === 'CRITICAL') return 'down';
          if (healthStatus === 'WARNING') return 'degraded';
          return 'operational';
        },

        reset: () => {
          const { stopAutoRefresh } = get();
          stopAutoRefresh();
          set(initialState);
        },
      }),
      {
        name: 'monitoring-store',
        // Persist settings and some state
        partialize: (state) => ({
          settings: state.settings,
          lastRefresh: state.lastRefresh,
        }),
      }
    ),
    { name: 'monitoring-store' }
  )
);

// Helper hook for reactive monitoring status
export const useMonitoringStatus = () => {
  const store = useMonitoringStore();
  
  return {
    isHealthy: store.isHealthy(),
    hasActiveAlerts: store.hasActiveAlerts(),
    systemStatus: store.getSystemStatus(),
    criticalAlerts: store.getCriticalAlerts(),
    warningAlerts: store.getWarningAlerts(),
    healthStatus: store.healthStatus,
    lastRefresh: store.lastRefresh,
    isLoading: store.isLoading,
    error: store.error,
  };
};