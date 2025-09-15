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

interface AnalyticsState {
  selectedIncident: Incident | null;
  incidentSummary: IncidentSummary | null;
  incidents: Incident[];
  isLoading: boolean;
  isLoadingIncidents: boolean;
  isLoadingSummary: boolean;
  error: string | null;
  lastRefresh: Date | null;
  
  fetchIncidents: () => Promise<void>;
  setSelectedIncident: (incident: Incident | null) => void;
  fetchIncidentSummary: (incidentId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  selectedIncident: null,
  incidentSummary: null,
  incidents: [],
  isLoading: false,
  isLoadingIncidents: false,
  isLoadingSummary: false,
  error: null,
  lastRefresh: null,
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
      set({ selectedIncident: incident, incidentSummary: null });
      
      if (incident) {
        get().fetchIncidentSummary(incident.id);
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

    refreshData: async () => {
      set({ isLoading: true });
      
      const promises = [get().fetchIncidents()];
      
      if (get().selectedIncident) {
        promises.push(get().fetchIncidentSummary(get().selectedIncident!.id));
      }
      
      await Promise.all(promises);
      
      set({ isLoading: false });
    },

    reset: () => set(initialState),
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