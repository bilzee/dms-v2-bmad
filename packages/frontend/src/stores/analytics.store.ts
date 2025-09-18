import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { IncidentStatus } from '@dms/shared';

interface Incident {
  id: string;
  name: string;
  type: string;
  status: IncidentStatus;
  declarationDate: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface IncidentSummary {
  incident: {
    id: string;
    title: string;
    status: IncidentStatus;
    declarationDate: string;
    currentDate: string;
    duration: {
      days: number;
      hours: number;
      formatted: string;
    };
  };
  populationImpact: {
    livesLost: number;
    injured: number;
    displaced: number;
    housesAffected: number;
  };
  aggregates: {
    affectedEntities: number;
    totalAffectedPopulation: number;
    totalAffectedHouseholds: number;
  };
}

interface EntityGap {
  entityId: string;
  entityName: string;
  assessmentAreas: {
    Health: 'red' | 'yellow' | 'green';
    WASH: 'red' | 'yellow' | 'green';
    Food: 'red' | 'yellow' | 'green';
    Shelter: 'red' | 'yellow' | 'green';
    Security: 'red' | 'yellow' | 'green';
  };
}

interface QuickStatistics {
  overallSeverity: {
    Health: 'red' | 'yellow' | 'green';
    WASH: 'red' | 'yellow' | 'green';
    Food: 'red' | 'yellow' | 'green';
    Shelter: 'red' | 'yellow' | 'green';
    Security: 'red' | 'yellow' | 'green';
  };
  totalCriticalGaps: number;
  totalModerateGaps: number;
  totalMinimalGaps: number;
}

interface EntityGapsSummary {
  entityGaps: EntityGap[];
  quickStatistics: QuickStatistics;
}

interface UpdateNotification {
  type: 'data_update';
  timestamp: string;
  changes: {
    incidents?: string[];
    assessments?: string[];
    responses?: string[];
  };
  affectedEntities?: string[];
}

interface RealtimeState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: Date | null;
  pendingUpdates: number;
  retryCount: number;
  maxRetries: number;
}

interface AnalyticsState {
  selectedIncident: Incident | null;
  incidentSummary: IncidentSummary | null;
  entityGapsSummary: EntityGapsSummary | null;
  incidents: Incident[];
  isLoading: boolean;
  isLoadingIncidents: boolean;
  isLoadingSummary: boolean;
  isLoadingEntityGaps: boolean;
  error: string | null;
  lastRefresh: Date | null;
  
  // Real-time state
  realtime: RealtimeState;
  eventSource: EventSource | null;
  autoRefreshTimer: NodeJS.Timeout | null;
  
  fetchIncidents: () => Promise<void>;
  setSelectedIncident: (incident: Incident | null) => void;
  fetchIncidentSummary: (incidentId: string) => Promise<void>;
  fetchEntityGapsSummary: (incidentId: string, entityIds?: string[]) => Promise<void>;
  refreshData: () => Promise<void>;
  reset: () => void;
  
  // Real-time methods
  startRealtimeConnection: () => void;
  stopRealtimeConnection: () => void;
  handleRealtimeUpdate: (notification: UpdateNotification) => void;
  startFallbackPolling: () => void;
  stopFallbackPolling: () => void;
  retryConnection: () => void;
}

const initialState = {
  selectedIncident: null,
  incidentSummary: null,
  entityGapsSummary: null,
  incidents: [],
  isLoading: false,
  isLoadingIncidents: false,
  isLoadingSummary: false,
  isLoadingEntityGaps: false,
  error: null,
  lastRefresh: null,
  
  // Real-time state
  realtime: {
    isConnected: false,
    connectionStatus: 'disconnected' as const,
    lastUpdate: null,
    pendingUpdates: 0,
    retryCount: 0,
    maxRetries: 5,
  },
  eventSource: null,
  autoRefreshTimer: null,
};

export const useAnalyticsStore = create<AnalyticsState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    fetchIncidents: async () => {
      set({ isLoadingIncidents: true, error: null });

      try {
        const response = await fetch('/api/v1/incidents?pageSize=100');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch incidents');
        }

        const incidents: Incident[] = data.data.incidents.map((incident: any) => ({
          id: incident.id,
          name: incident.name,
          type: incident.type,
          status: incident.status,
          declarationDate: incident.date,
          coordinates: incident.coordinates,
        }));

        set({
          incidents,
          isLoadingIncidents: false,
          lastRefresh: new Date(),
        });

      } catch (error) {
        console.error('Failed to fetch incidents:', error);
        set({ 
          isLoadingIncidents: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    },

    setSelectedIncident: (incident: Incident | null) => {
      set({ selectedIncident: incident, incidentSummary: null, entityGapsSummary: null });
      
      if (incident) {
        get().fetchIncidentSummary(incident.id);
        get().fetchEntityGapsSummary(incident.id);
      }
    },

    fetchIncidentSummary: async (incidentId: string) => {
      set({ isLoadingSummary: true, error: null });

      try {
        const response = await fetch(`/api/v1/monitoring/analytics/incidents/${incidentId}/summary`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch incident summary');
        }

        set({
          incidentSummary: data.data.summary,
          isLoadingSummary: false,
        });

      } catch (error) {
        console.error('Failed to fetch incident summary:', error);
        set({ 
          isLoadingSummary: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    },

    fetchEntityGapsSummary: async (incidentId: string, entityIds?: string[]) => {
      set({ isLoadingEntityGaps: true, error: null });

      try {
        const url = new URL('/api/v1/monitoring/analytics/entities/gaps-summary', window.location.origin);
        url.searchParams.set('incidentId', incidentId);
        if (entityIds && entityIds.length > 0) {
          url.searchParams.set('entityIds', entityIds.join(','));
        }

        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch entity gaps summary');
        }

        set({
          entityGapsSummary: data.data,
          isLoadingEntityGaps: false,
        });

      } catch (error) {
        console.error('Failed to fetch entity gaps summary:', error);
        set({ 
          isLoadingEntityGaps: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    },

    refreshData: async () => {
      set({ isLoading: true });
      
      const promises = [get().fetchIncidents()];
      
      if (get().selectedIncident) {
        promises.push(get().fetchIncidentSummary(get().selectedIncident!.id));
        promises.push(get().fetchEntityGapsSummary(get().selectedIncident!.id));
      }
      
      await Promise.all(promises);
      
      set({ isLoading: false });
    },

    reset: () => {
      const { stopRealtimeConnection, stopFallbackPolling } = get();
      stopRealtimeConnection();
      stopFallbackPolling();
      set(initialState);
    },

    // Real-time methods
    startRealtimeConnection: () => {
      const state = get();
      
      // Close existing connection if any
      if (state.eventSource) {
        state.eventSource.close();
      }

      set((state) => ({
        realtime: {
          ...state.realtime,
          connectionStatus: 'connecting',
          retryCount: 0,
        }
      }));

      try {
        const eventSource = new EventSource('/api/v1/monitoring/analytics/realtime');
        
        eventSource.onopen = () => {
          set((state) => ({
            realtime: {
              ...state.realtime,
              isConnected: true,
              connectionStatus: 'connected',
              retryCount: 0,
            }
          }));
          
          // Stop fallback polling when real-time connection is established
          get().stopFallbackPolling();
        };

        eventSource.onmessage = (event) => {
          try {
            const notification: UpdateNotification = JSON.parse(event.data);
            get().handleRealtimeUpdate(notification);
          } catch (error) {
            console.error('Failed to parse real-time update:', error);
          }
        };

        eventSource.onerror = () => {
          set((state) => ({
            realtime: {
              ...state.realtime,
              isConnected: false,
              connectionStatus: 'error',
            }
          }));
          
          // Start fallback polling and retry connection
          get().startFallbackPolling();
          get().retryConnection();
        };

        set({ eventSource });
      } catch (error) {
        console.error('Failed to start real-time connection:', error);
        set((state) => ({
          realtime: {
            ...state.realtime,
            connectionStatus: 'error',
          }
        }));
        get().startFallbackPolling();
      }
    },

    stopRealtimeConnection: () => {
      const { eventSource } = get();
      
      if (eventSource) {
        eventSource.close();
        set({ eventSource: null });
      }
      
      set((state) => ({
        realtime: {
          ...state.realtime,
          isConnected: false,
          connectionStatus: 'disconnected',
        }
      }));
    },

    handleRealtimeUpdate: (notification: UpdateNotification) => {
      const { selectedIncident, fetchIncidents, fetchIncidentSummary, fetchEntityGapsSummary } = get();
      
      set((state) => ({
        realtime: {
          ...state.realtime,
          lastUpdate: new Date(),
          pendingUpdates: state.realtime.pendingUpdates + 1,
        }
      }));

      // Debounce updates to prevent UI thrashing
      const debounceKey = 'analytics-update';
      const existingTimeout = (globalThis as any)[debounceKey];
      
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      (globalThis as any)[debounceKey] = setTimeout(async () => {
        try {
          const promises = [];
          
          // Update incidents if changed
          if (notification.changes.incidents?.length) {
            promises.push(fetchIncidents());
          }
          
          // Update selected incident data if affected
          if (selectedIncident && (
            notification.changes.incidents?.includes(selectedIncident.id) ||
            notification.changes.assessments?.length ||
            notification.changes.responses?.length ||
            notification.affectedEntities?.length
          )) {
            promises.push(fetchIncidentSummary(selectedIncident.id));
            promises.push(fetchEntityGapsSummary(selectedIncident.id));
          }
          
          await Promise.all(promises);
          
          set((state) => ({
            realtime: {
              ...state.realtime,
              pendingUpdates: Math.max(0, state.realtime.pendingUpdates - 1),
            }
          }));
        } catch (error) {
          console.error('Failed to handle real-time update:', error);
        }
      }, 300); // 300ms debounce
    },

    startFallbackPolling: () => {
      const { autoRefreshTimer, stopFallbackPolling } = get();
      
      // Clear existing timer
      if (autoRefreshTimer) {
        stopFallbackPolling();
      }
      
      // Use 25-second interval similar to monitoring store
      const timer = setInterval(() => {
        get().refreshData();
      }, 25000);
      
      set({ autoRefreshTimer: timer });
    },

    stopFallbackPolling: () => {
      const { autoRefreshTimer } = get();
      
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        set({ autoRefreshTimer: null });
      }
    },

    retryConnection: () => {
      const { realtime } = get();
      
      if (realtime.retryCount >= realtime.maxRetries) {
        console.warn('Max retry attempts reached for real-time connection');
        return;
      }
      
      const retryDelay = Math.min(1000 * Math.pow(2, realtime.retryCount), 30000); // Exponential backoff, max 30s
      
      set((state) => ({
        realtime: {
          ...state.realtime,
          retryCount: state.realtime.retryCount + 1,
        }
      }));
      
      setTimeout(() => {
        get().startRealtimeConnection();
      }, retryDelay);
    },
  }))
);

export const useAnalyticsIncidents = () => useAnalyticsStore((state) => ({
  incidents: state.incidents,
  selectedIncident: state.selectedIncident,
  isLoadingIncidents: state.isLoadingIncidents,
  fetchIncidents: state.fetchIncidents,
  setSelectedIncident: state.setSelectedIncident,
}));

export const useAnalyticsSummary = () => useAnalyticsStore((state) => ({
  incidentSummary: state.incidentSummary,
  isLoadingSummary: state.isLoadingSummary,
  fetchIncidentSummary: state.fetchIncidentSummary,
}));

export const useAnalyticsRefresh = () => useAnalyticsStore((state) => ({
  lastRefresh: state.lastRefresh,
  refreshData: state.refreshData,
  error: state.error,
  isLoading: state.isLoading,
}));

export const useAnalyticsEntityGaps = () => useAnalyticsStore((state) => ({
  entityGapsSummary: state.entityGapsSummary,
  isLoadingEntityGaps: state.isLoadingEntityGaps,
  fetchEntityGapsSummary: state.fetchEntityGapsSummary,
}));

export const useAnalyticsRealtime = () => useAnalyticsStore((state) => ({
  realtime: state.realtime,
  startRealtimeConnection: state.startRealtimeConnection,
  stopRealtimeConnection: state.stopRealtimeConnection,
  startFallbackPolling: state.startFallbackPolling,
  stopFallbackPolling: state.stopFallbackPolling,
}));