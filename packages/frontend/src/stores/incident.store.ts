import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentFilters,
  IncidentCreationData,
  IncidentStatusUpdate,
  IncidentTimeline,
  IncidentTimelineEvent,
  IncidentActionItem
} from '@dms/shared';
import { authFetch } from '@/lib/auth/api-utils';

interface IncidentListItem {
  id: string;
  name: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  date: Date;
  affectedEntityCount: number;
  assessmentCount: number;
  responseCount: number;
  lastUpdated: Date;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface IncidentDetail extends IncidentListItem {
  subType?: string;
  source?: string;
  description?: string;
  affectedEntityIds: string[];
  preliminaryAssessmentIds: string[];
  actionItems: IncidentActionItem[];
  timeline: IncidentTimelineEvent[];
}

interface IncidentStats {
  totalIncidents: number;
  activeIncidents: number;
  highPriorityIncidents: number;
  recentlyUpdated: number;
  byType: Record<IncidentType, number>;
  bySeverity: Record<IncidentSeverity, number>;
  byStatus: Record<IncidentStatus, number>;
}

interface IncidentState {
  // Incident List Data
  incidents: IncidentListItem[];
  incidentDetails: Record<string, IncidentDetail>;
  incidentStats: IncidentStats;
  
  // Pagination and Loading
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  
  // UI State
  isLoading: boolean;
  isLoadingDetail: boolean;
  isCreating: boolean;
  isUpdatingStatus: boolean;
  error: string | null;
  detailError: string | null;
  
  // Selection and Preview
  selectedIncidentIds: string[];
  isPreviewOpen: boolean;
  previewIncident: IncidentDetail | null;
  
  // Filters and Sorting
  filters: IncidentFilters;
  sortBy: 'priority' | 'date' | 'type' | 'status' | 'severity';
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
  
  // Creation State
  creationForm: {
    isOpen: boolean;
    initialData?: Partial<IncidentCreationData>;
    fromAssessmentId?: string;
  };
  
  // Status Update State
  statusUpdateForm: {
    isOpen: boolean;
    incidentId?: string;
    currentStatus?: IncidentStatus;
  };
  
  // Entity Linking State
  entityLinkingForm: {
    isOpen: boolean;
    incidentId?: string;
    currentEntityIds?: string[];
  };

  // Data Actions
  fetchIncidents: (request?: {
    page?: number;
    pageSize?: number;
    filters?: Partial<IncidentFilters>;
    sortBy?: string;
    sortOrder?: string;
    searchTerm?: string;
  }) => Promise<void>;
  
  fetchIncidentDetail: (incidentId: string) => Promise<IncidentDetail>;
  fetchIncidentTimeline: (incidentId: string) => Promise<IncidentTimelineEvent[]>;
  refreshStats: () => Promise<void>;
  
  // Incident Management Actions
  createIncident: (incidentData: IncidentCreationData) => Promise<string>;
  updateIncidentStatus: (statusUpdate: IncidentStatusUpdate) => Promise<void>;
  linkEntitiesToIncident: (incidentId: string, entityIds: string[]) => Promise<void>;
  unlinkEntityFromIncident: (incidentId: string, entityId: string) => Promise<void>;
  addActionItem: (incidentId: string, actionItem: Omit<IncidentActionItem, 'id'>) => Promise<void>;
  updateActionItem: (incidentId: string, actionItemId: string, updates: Partial<IncidentActionItem>) => Promise<void>;
  
  // UI Actions
  setFilters: (filters: Partial<IncidentFilters>) => void;
  setSorting: (sortBy: 'priority' | 'date' | 'type' | 'status' | 'severity', sortOrder: 'asc' | 'desc') => void;
  setSearchTerm: (term: string) => void;
  setPage: (page: number) => void;
  
  // Selection Actions
  toggleIncidentSelection: (incidentId: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
  getSelectedCount: () => number;
  
  // Preview Actions
  openPreview: (incidentId: string) => Promise<void>;
  closePreview: () => void;
  
  // Form Actions
  openCreationForm: (initialData?: Partial<IncidentCreationData>, fromAssessmentId?: string) => void;
  closeCreationForm: () => void;
  
  openStatusUpdateForm: (incidentId: string, currentStatus: IncidentStatus) => void;
  closeStatusUpdateForm: () => void;
  
  openEntityLinkingForm: (incidentId: string, currentEntityIds: string[]) => void;
  closeEntityLinkingForm: () => void;
  
  // Utility Actions
  reset: () => void;
  getHighPriorityCount: () => number;
  getActiveCount: () => number;
}

const initialState = {
  incidents: [],
  incidentDetails: {},
  incidentStats: {
    totalIncidents: 0,
    activeIncidents: 0,
    highPriorityIncidents: 0,
    recentlyUpdated: 0,
    byType: {} as Record<IncidentType, number>,
    bySeverity: {} as Record<IncidentSeverity, number>,
    byStatus: {} as Record<IncidentStatus, number>,
  },
  pagination: {
    page: 1,
    pageSize: 20,
    totalPages: 0,
    totalCount: 0,
  },
  isLoading: false,
  isLoadingDetail: false,
  isCreating: false,
  isUpdatingStatus: false,
  error: null,
  detailError: null,
  selectedIncidentIds: [],
  isPreviewOpen: false,
  previewIncident: null,
  filters: {},
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
  searchTerm: '',
  creationForm: {
    isOpen: false,
  },
  statusUpdateForm: {
    isOpen: false,
  },
  entityLinkingForm: {
    isOpen: false,
  },
};

export const useIncidentStore = create<IncidentState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    fetchIncidents: async (request = {}) => {
      const state = get();
      set({ isLoading: true, error: null });

      try {
        const params = new URLSearchParams();
        
        const finalRequest = {
          page: state.pagination.page,
          pageSize: state.pagination.pageSize,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          filters: state.filters,
          searchTerm: state.searchTerm,
          ...request,
        };

        Object.entries(finalRequest).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'filters' && typeof value === 'object') {
              params.append(key, JSON.stringify(value));
            } else {
              params.append(key, String(value));
            }
          }
        });

        const response = await authFetch(`/api/v1/incidents?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch incidents');
        }

        set({
          incidents: data.data.incidents,
          incidentStats: data.data.stats,
          pagination: data.data.pagination,
          isLoading: false,
          error: null,
        });

      } catch (error) {
        console.error('Failed to fetch incidents:', error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    },

    fetchIncidentDetail: async (incidentId: string) => {
      set({ isLoadingDetail: true, detailError: null });

      try {
        const response = await authFetch(`/api/v1/incidents/${incidentId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch incident details');
        }

        const incident = data.data.incident;
        
        set((state) => ({
          incidentDetails: {
            ...state.incidentDetails,
            [incidentId]: incident,
          },
          isLoadingDetail: false,
          detailError: null,
        }));

        return incident;

      } catch (error) {
        console.error('Failed to fetch incident detail:', error);
        set({ 
          isLoadingDetail: false, 
          detailError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    fetchIncidentTimeline: async (incidentId: string) => {
      try {
        const response = await authFetch(`/api/v1/incidents/${incidentId}/timeline`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch incident timeline');
        }

        // Update the incident details with timeline
        set((state) => ({
          incidentDetails: {
            ...state.incidentDetails,
            [incidentId]: {
              ...state.incidentDetails[incidentId],
              timeline: data.data.timeline,
            } as IncidentDetail,
          },
        }));

        return data.data.timeline;

      } catch (error) {
        console.error('Failed to fetch incident timeline:', error);
        throw error;
      }
    },

    refreshStats: async () => {
      try {
        const response = await authFetch('/api/v1/incidents/stats');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to refresh stats');
        }

        set({ incidentStats: data.data.stats });

      } catch (error) {
        console.error('Failed to refresh stats:', error);
      }
    },

    createIncident: async (incidentData: IncidentCreationData) => {
      set({ isCreating: true, error: null });

      try {
        const response = await authFetch('/api/v1/incidents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(incidentData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create incident');
        }

        // Refresh incidents list and stats
        await get().fetchIncidents();
        await get().refreshStats();
        
        set({ isCreating: false });
        get().closeCreationForm();

        return result.data.incident.id;

      } catch (error) {
        console.error('Failed to create incident:', error);
        set({ 
          isCreating: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    updateIncidentStatus: async (statusUpdate: IncidentStatusUpdate) => {
      set({ isUpdatingStatus: true, error: null });

      try {
        const response = await authFetch(`/api/v1/incidents/${statusUpdate.incidentId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(statusUpdate),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update incident status');
        }

        // Refresh data
        await get().fetchIncidents();
        if (get().incidentDetails[statusUpdate.incidentId]) {
          await get().fetchIncidentDetail(statusUpdate.incidentId);
        }
        await get().refreshStats();
        
        set({ isUpdatingStatus: false });
        get().closeStatusUpdateForm();

      } catch (error) {
        console.error('Failed to update incident status:', error);
        set({ 
          isUpdatingStatus: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    linkEntitiesToIncident: async (incidentId: string, entityIds: string[]) => {
      try {
        const response = await authFetch(`/api/v1/incidents/${incidentId}/entities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entityIds }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to link entities to incident');
        }

        // Refresh incident details
        if (get().incidentDetails[incidentId]) {
          await get().fetchIncidentDetail(incidentId);
        }

        get().closeEntityLinkingForm();

      } catch (error) {
        console.error('Failed to link entities to incident:', error);
        throw error;
      }
    },

    unlinkEntityFromIncident: async (incidentId: string, entityId: string) => {
      try {
        const response = await authFetch(`/api/v1/incidents/${incidentId}/entities/${entityId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to unlink entity from incident');
        }

        // Refresh incident details
        if (get().incidentDetails[incidentId]) {
          await get().fetchIncidentDetail(incidentId);
        }

      } catch (error) {
        console.error('Failed to unlink entity from incident:', error);
        throw error;
      }
    },

    addActionItem: async (incidentId: string, actionItem: Omit<IncidentActionItem, 'id'>) => {
      try {
        console.log('Store: Adding action item to incident:', incidentId);
        console.log('Store: Action item data:', actionItem);
        
        const response = await authFetch(`/api/v1/incidents/${incidentId}/action-items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(actionItem),
        });

        console.log('Store: API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Store: API error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        console.log('Store: API response result:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to add action item');
        }

        // Update local state
        set((state) => ({
          incidentDetails: {
            ...state.incidentDetails,
            [incidentId]: {
              ...state.incidentDetails[incidentId],
              actionItems: [
                ...(state.incidentDetails[incidentId]?.actionItems || []),
                result.data.actionItem,
              ],
            } as IncidentDetail,
          },
        }));

      } catch (error) {
        console.error('Failed to add action item:', error);
        throw error;
      }
    },

    updateActionItem: async (incidentId: string, actionItemId: string, updates: Partial<IncidentActionItem>) => {
      try {
        const response = await authFetch(`/api/v1/incidents/${incidentId}/action-items/${actionItemId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update action item');
        }

        // Update local state
        set((state) => ({
          incidentDetails: {
            ...state.incidentDetails,
            [incidentId]: {
              ...state.incidentDetails[incidentId],
              actionItems: state.incidentDetails[incidentId]?.actionItems.map(item =>
                item.id === actionItemId ? { ...item, ...updates } : item
              ) || [],
            } as IncidentDetail,
          },
        }));

      } catch (error) {
        console.error('Failed to update action item:', error);
        throw error;
      }
    },

    deleteActionItem: async (incidentId: string, actionItemId: string) => {
      try {
        const response = await authFetch(`/api/v1/incidents/${incidentId}/action-items/${actionItemId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete action item');
        }

        // Update local state by removing the deleted action item
        set((state) => ({
          incidentDetails: {
            ...state.incidentDetails,
            [incidentId]: {
              ...state.incidentDetails[incidentId],
              actionItems: state.incidentDetails[incidentId]?.actionItems.filter(item => item.id !== actionItemId) || [],
            } as IncidentDetail,
          },
        }));

      } catch (error) {
        console.error('Failed to delete action item:', error);
        throw error;
      }
    },

    setFilters: (newFilters) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
        pagination: { ...state.pagination, page: 1 },
      }));
      
      get().fetchIncidents();
    },

    setSorting: (sortBy, sortOrder) => {
      set({ sortBy, sortOrder });
      get().fetchIncidents();
    },

    setSearchTerm: (term) => {
      set({ searchTerm: term, pagination: { ...get().pagination, page: 1 } });
      // Debouncing would be handled in the component
    },

    setPage: (page) => {
      set((state) => ({
        pagination: { ...state.pagination, page },
      }));
      get().fetchIncidents();
    },

    toggleIncidentSelection: (incidentId) => {
      set((state) => {
        const isSelected = state.selectedIncidentIds.includes(incidentId);
        return {
          selectedIncidentIds: isSelected
            ? state.selectedIncidentIds.filter(id => id !== incidentId)
            : [...state.selectedIncidentIds, incidentId],
        };
      });
    },

    selectAllVisible: () => {
      const { incidents } = get();
      set({ selectedIncidentIds: incidents.map(incident => incident.id) });
    },

    clearSelection: () => {
      set({ selectedIncidentIds: [] });
    },

    getSelectedCount: () => get().selectedIncidentIds.length,

    openPreview: async (incidentId: string) => {
      try {
        console.log('Opening preview for incident:', incidentId);
        const incident = await get().fetchIncidentDetail(incidentId);
        console.log('Fetched incident for preview:', incident);
        set({ previewIncident: incident, isPreviewOpen: true });
      } catch (error) {
        console.error('Failed to open incident preview:', error);
        // Set error state to show in UI
        set({ 
          detailError: error instanceof Error ? error.message : 'Failed to load incident details',
          isLoadingDetail: false 
        });
      }
    },

    closePreview: () => {
      set({ previewIncident: null, isPreviewOpen: false });
    },

    openCreationForm: (initialData, fromAssessmentId) => {
      set({
        creationForm: {
          isOpen: true,
          initialData,
          fromAssessmentId,
        },
      });
    },

    closeCreationForm: () => {
      set({
        creationForm: {
          isOpen: false,
          initialData: undefined,
          fromAssessmentId: undefined,
        },
      });
    },

    openStatusUpdateForm: (incidentId, currentStatus) => {
      set({
        statusUpdateForm: {
          isOpen: true,
          incidentId,
          currentStatus,
        },
      });
    },

    closeStatusUpdateForm: () => {
      set({
        statusUpdateForm: {
          isOpen: false,
          incidentId: undefined,
          currentStatus: undefined,
        },
      });
    },

    openEntityLinkingForm: (incidentId, currentEntityIds) => {
      set({
        entityLinkingForm: {
          isOpen: true,
          incidentId,
          currentEntityIds,
        },
      });
    },

    closeEntityLinkingForm: () => {
      set({
        entityLinkingForm: {
          isOpen: false,
          incidentId: undefined,
          currentEntityIds: undefined,
        },
      });
    },

    getHighPriorityCount: () => get().incidentStats.highPriorityIncidents,
    getActiveCount: () => get().incidentStats.activeIncidents,

    reset: () => set(initialState),
  }))
);

// Selector hooks for specific data
export const useIncidentData = () => useIncidentStore((state) => ({
  incidents: state.incidents,
  incidentStats: state.incidentStats,
  pagination: state.pagination,
  isLoading: state.isLoading,
  error: state.error,
}));

export const useIncidentFilters = () => useIncidentStore((state) => ({
  filters: state.filters,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
  searchTerm: state.searchTerm,
  setFilters: state.setFilters,
  setSorting: state.setSorting,
  setSearchTerm: state.setSearchTerm,
}));

export const useIncidentSelection = () => useIncidentStore((state) => ({
  selectedIncidentIds: state.selectedIncidentIds,
  toggleIncidentSelection: state.toggleIncidentSelection,
  selectAllVisible: state.selectAllVisible,
  clearSelection: state.clearSelection,
  getSelectedCount: state.getSelectedCount,
}));

export const useIncidentPreview = () => useIncidentStore((state) => ({
  isPreviewOpen: state.isPreviewOpen,
  previewIncident: state.previewIncident,
  openPreview: state.openPreview,
  closePreview: state.closePreview,
  isLoadingDetail: state.isLoadingDetail,
  detailError: state.detailError,
}));

export const useIncidentForms = () => useIncidentStore((state) => ({
  creationForm: state.creationForm,
  statusUpdateForm: state.statusUpdateForm,
  entityLinkingForm: state.entityLinkingForm,
  isCreating: state.isCreating,
  isUpdatingStatus: state.isUpdatingStatus,
  openCreationForm: state.openCreationForm,
  closeCreationForm: state.closeCreationForm,
  openStatusUpdateForm: state.openStatusUpdateForm,
  closeStatusUpdateForm: state.closeStatusUpdateForm,
  openEntityLinkingForm: state.openEntityLinkingForm,
  closeEntityLinkingForm: state.closeEntityLinkingForm,
}));

export const useIncidentActions = () => useIncidentStore((state) => ({
  createIncident: state.createIncident,
  updateIncidentStatus: state.updateIncidentStatus,
  linkEntitiesToIncident: state.linkEntitiesToIncident,
  unlinkEntityFromIncident: state.unlinkEntityFromIncident,
  addActionItem: state.addActionItem,
  updateActionItem: state.updateActionItem,
  deleteActionItem: state.deleteActionItem,
  fetchIncidentDetail: state.fetchIncidentDetail,
  fetchIncidentTimeline: state.fetchIncidentTimeline,
}));