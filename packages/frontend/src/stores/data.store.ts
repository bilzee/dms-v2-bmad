import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Incident, Assessment, Response } from '@/hooks/useRealData';

// Define the store state
interface DataStoreState {
  // Cache for recent data
  recentIncidents: Incident[];
  recentAssessments: Assessment[];
  recentResponses: Response[];
  
  // User preferences and filters
  userPreferences: {
    defaultIncidentFilters: Record<string, any>;
    defaultAssessmentFilters: Record<string, any>;
    defaultResponseFilters: Record<string, any>;
    refreshIntervals: {
      incidents: number;
      assessments: number;
      responses: number;
      stats: number;
    };
    autoRefresh: boolean;
  };
  
  // Offline data
  offlineData: {
    incidents: Incident[];
    assessments: Assessment[];
    responses: Response[];
    lastSync: Date | null;
    pendingChanges: Array<{
      type: 'create' | 'update' | 'delete';
      entityType: 'incident' | 'assessment' | 'response';
      data: any;
      timestamp: Date;
    }>;
  };
  
  // Real-time updates
  realTimeUpdates: {
    lastUpdate: Date | null;
    updateQueue: Array<{
      id: string;
      type: 'incident' | 'assessment' | 'response';
      action: 'created' | 'updated' | 'deleted';
      data: any;
      timestamp: Date;
    }>;
  };
  
  // Loading states
  loadingStates: {
    incidents: boolean;
    assessments: boolean;
    responses: boolean;
    stats: boolean;
  };
  
  // Error states
  errors: {
    incidents: string | null;
    assessments: string | null;
    responses: string | null;
    general: string | null;
  };
  
  // Actions
  updateRecentIncidents: (incidents: Incident[]) => void;
  updateRecentAssessments: (assessments: Assessment[]) => void;
  updateRecentResponses: (responses: Response[]) => void;
  
  updateUserPreferences: (preferences: Partial<DataStoreState['userPreferences']>) => void;
  
  addToOfflineData: (type: 'incidents' | 'assessments' | 'responses', data: any[]) => void;
  updateOfflineData: (type: 'incidents' | 'assessments' | 'responses', id: string, updates: any) => void;
  removeFromOfflineData: (type: 'incidents' | 'assessments' | 'responses', id: string) => void;
  addPendingChange: (change: DataStoreState['offlineData']['pendingChanges'][0]) => void;
  removePendingChange: (index: number) => void;
  clearPendingChanges: () => void;
  setLastSync: (date: Date) => void;
  
  addRealTimeUpdate: (update: DataStoreState['realTimeUpdates']['updateQueue'][0]) => void;
  clearUpdateQueue: () => void;
  
  setLoadingState: (key: keyof DataStoreState['loadingStates'], isLoading: boolean) => void;
  setError: (key: keyof DataStoreState['errors'], error: string | null) => void;
  clearAllErrors: () => void;
  
  // Utility actions
  getIncidentById: (id: string) => Incident | undefined;
  getAssessmentById: (id: string) => Assessment | undefined;
  getResponseById: (id: string) => Response | undefined;
  getPendingChangesCount: () => number;
  getOfflineDataCount: () => { incidents: number; assessments: number; responses: number };
  
  // Reset
  reset: () => void;
}

// Initial state
const initialState: Omit<DataStoreState, 'updateRecentIncidents' | 'updateRecentAssessments' | 'updateRecentResponses' | 'updateUserPreferences' | 'addToOfflineData' | 'updateOfflineData' | 'removeFromOfflineData' | 'addPendingChange' | 'removePendingChange' | 'clearPendingChanges' | 'setLastSync' | 'addRealTimeUpdate' | 'clearUpdateQueue' | 'setLoadingState' | 'setError' | 'clearAllErrors' | 'getIncidentById' | 'getAssessmentById' | 'getResponseById' | 'getPendingChangesCount' | 'getOfflineDataCount' | 'reset'> = {
  recentIncidents: [],
  recentAssessments: [],
  recentResponses: [],
  
  userPreferences: {
    defaultIncidentFilters: {},
    defaultAssessmentFilters: {},
    defaultResponseFilters: {},
    refreshIntervals: {
      incidents: 30000,
      assessments: 45000,
      responses: 60000,
      stats: 10000,
    },
    autoRefresh: true,
  },
  
  offlineData: {
    incidents: [],
    assessments: [],
    responses: [],
    lastSync: null,
    pendingChanges: [],
  },
  
  realTimeUpdates: {
    lastUpdate: null,
    updateQueue: [],
  },
  
  loadingStates: {
    incidents: false,
    assessments: false,
    responses: false,
    stats: false,
  },
  
  errors: {
    incidents: null,
    assessments: null,
    responses: null,
    general: null,
  },
};

// Create the store
export const useDataStore = create<DataStoreState>()(
  persist(
    (set, get) => ({
        ...initialState,

        // Data update actions
        updateRecentIncidents: (incidents) => {
          set((state) => ({
            recentIncidents: incidents.slice(0, 50), // Keep only last 50
          }));
        },

        updateRecentAssessments: (assessments) => {
          set((state) => ({
            recentAssessments: assessments.slice(0, 50),
          }));
        },

        updateRecentResponses: (responses) => {
          set((state) => ({
            recentResponses: responses.slice(0, 50),
          }));
        },

        // User preferences actions
        updateUserPreferences: (preferences) => {
          set((state) => ({
            userPreferences: {
              ...state.userPreferences,
              ...preferences,
              refreshIntervals: {
                ...state.userPreferences.refreshIntervals,
                ...preferences.refreshIntervals,
              },
            },
          }));
        },

        // Offline data actions
        addToOfflineData: (type, data) => {
          set((state) => ({
            offlineData: {
              ...state.offlineData,
              [type]: [...state.offlineData[type], ...data],
            },
          }));
        },

        updateOfflineData: (type, id, updates) => {
          set((state) => ({
            offlineData: {
              ...state.offlineData,
              [type]: state.offlineData[type].map((item) =>
                item.id === id ? { ...item, ...updates } : item
              ),
            },
          }));
        },

        removeFromOfflineData: (type, id) => {
          set((state) => ({
            offlineData: {
              ...state.offlineData,
              [type]: state.offlineData[type].filter((item) => item.id !== id),
            },
          }));
        },

        addPendingChange: (change) => {
          set((state) => ({
            offlineData: {
              ...state.offlineData,
              pendingChanges: [...state.offlineData.pendingChanges, change],
            },
          }));
        },

        removePendingChange: (index) => {
          set((state) => ({
            offlineData: {
              ...state.offlineData,
              pendingChanges: state.offlineData.pendingChanges.filter((_, i) => i !== index),
            },
          }));
        },

        clearPendingChanges: () => {
          set((state) => ({
            offlineData: {
              ...state.offlineData,
              pendingChanges: [],
            },
          }));
        },

        setLastSync: (date) => {
          set((state) => ({
            offlineData: {
              ...state.offlineData,
              lastSync: date,
            },
          }));
        },

        // Real-time update actions
        addRealTimeUpdate: (update) => {
          set((state) => ({
            realTimeUpdates: {
              lastUpdate: new Date(),
              updateQueue: [...state.realTimeUpdates.updateQueue, update],
            },
          }));
        },

        clearUpdateQueue: () => {
          set((state) => ({
            realTimeUpdates: {
              ...state.realTimeUpdates,
              updateQueue: [],
            },
          }));
        },

        // Loading state actions
        setLoadingState: (key, isLoading) => {
          set((state) => ({
            loadingStates: {
              ...state.loadingStates,
              [key]: isLoading,
            },
          }));
        },

        // Error actions
        setError: (key, error) => {
          set((state) => ({
            errors: {
              ...state.errors,
              [key]: error,
            },
          }));
        },

        clearAllErrors: () => {
          set({
            errors: {
              incidents: null,
              assessments: null,
              responses: null,
              general: null,
            },
          });
        },

        // Utility actions
        getIncidentById: (id) => {
          return get().recentIncidents.find((incident) => incident.id === id);
        },

        getAssessmentById: (id) => {
          return get().recentAssessments.find((assessment) => assessment.id === id);
        },

        getResponseById: (id) => {
          return get().recentResponses.find((response) => response.id === id);
        },

        getPendingChangesCount: () => {
          return get().offlineData.pendingChanges.length;
        },

        getOfflineDataCount: () => {
          const state = get();
          return {
            incidents: state.offlineData.incidents.length,
            assessments: state.offlineData.assessments.length,
            responses: state.offlineData.responses.length,
          };
        },

        // Reset action
        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'dms-data-store',
        version: 1,
        // Only persist user preferences and offline data
        partialize: (state) => ({
          userPreferences: state.userPreferences,
          offlineData: state.offlineData,
        }),
      }
    )
);

// Selector hooks for specific data
export const useRecentIncidents = () => useDataStore((state) => state.recentIncidents);
export const useRecentAssessments = () => useDataStore((state) => state.recentAssessments);
export const useRecentResponses = () => useDataStore((state) => state.recentResponses);

export const useUserPreferences = () => useDataStore((state) => ({
  preferences: state.userPreferences,
  updatePreferences: state.updateUserPreferences,
}));

export const useOfflineData = () => useDataStore((state) => ({
  offlineData: state.offlineData,
  addToOfflineData: state.addToOfflineData,
  updateOfflineData: state.updateOfflineData,
  removeFromOfflineData: state.removeFromOfflineData,
  addPendingChange: state.addPendingChange,
  removePendingChange: state.removePendingChange,
  clearPendingChanges: state.clearPendingChanges,
  setLastSync: state.setLastSync,
  getPendingChangesCount: state.getPendingChangesCount,
  getOfflineDataCount: state.getOfflineDataCount,
}));

export const useRealTimeUpdates = () => useDataStore((state) => ({
  lastUpdate: state.realTimeUpdates.lastUpdate,
  updateQueue: state.realTimeUpdates.updateQueue,
  addUpdate: state.addRealTimeUpdate,
  clearQueue: state.clearUpdateQueue,
}));

export const useDataLoadingStates = () => useDataStore((state) => state.loadingStates);
export const useDataErrors = () => useDataStore((state) => ({
  errors: state.errors,
  setError: state.setError,
  clearAllErrors: state.clearAllErrors,
}));

export const useDataUtilities = () => useDataStore((state) => ({
  getIncidentById: state.getIncidentById,
  getAssessmentById: state.getAssessmentById,
  getResponseById: state.getResponseById,
}));