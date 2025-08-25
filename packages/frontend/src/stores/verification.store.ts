import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  AssessmentVerificationQueueItem, 
  VerificationQueueFilters,
  VerificationQueueRequest,
  BatchVerificationRequest,
  RapidAssessment 
} from '@dms/shared';

interface VerificationState {
  // Queue Data
  queue: AssessmentVerificationQueueItem[];
  queueStats: {
    totalPending: number;
    highPriority: number;
    requiresAttention: number;
    byAssessmentType: Record<string, number>;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedAssessmentIds: string[];
  isPreviewOpen: boolean;
  previewAssessment: RapidAssessment | null;
  
  // Filters and Sorting
  filters: VerificationQueueFilters;
  sortBy: 'priority' | 'date' | 'type' | 'assessor';
  sortOrder: 'asc' | 'desc';

  // Batch Operations
  isBatchProcessing: boolean;
  batchProgress: {
    processed: number;
    total: number;
    currentOperation: string;
  };

  // Actions
  fetchQueue: (request?: Partial<VerificationQueueRequest>) => Promise<void>;
  setFilters: (filters: Partial<VerificationQueueFilters>) => void;
  setSorting: (sortBy: 'priority' | 'date' | 'type' | 'assessor', sortOrder: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  
  // Selection
  toggleAssessmentSelection: (assessmentId: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
  
  // Preview
  openPreview: (assessment: RapidAssessment) => void;
  closePreview: () => void;
  
  // Verification Actions
  verifyAssessment: (assessmentId: string, action: 'APPROVE' | 'REJECT', feedback?: any) => Promise<void>;
  batchVerify: (request: BatchVerificationRequest) => Promise<void>;
  
  // Utility
  reset: () => void;
  getSelectedCount: () => number;
  getHighPriorityCount: () => number;
}

const initialState = {
  queue: [],
  queueStats: {
    totalPending: 0,
    highPriority: 0,
    requiresAttention: 0,
    byAssessmentType: {},
  },
  pagination: {
    page: 1,
    pageSize: 20,
    totalPages: 0,
    totalCount: 0,
  },
  isLoading: false,
  error: null,
  selectedAssessmentIds: [],
  isPreviewOpen: false,
  previewAssessment: null,
  filters: {},
  sortBy: 'priority' as const,
  sortOrder: 'desc' as const,
  isBatchProcessing: false,
  batchProgress: {
    processed: 0,
    total: 0,
    currentOperation: '',
  },
};

export const useVerificationStore = create<VerificationState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    fetchQueue: async (request?: Partial<VerificationQueueRequest>) => {
      const state = get();
      set({ isLoading: true, error: null });

      try {
        const params = new URLSearchParams();
        
        const finalRequest: VerificationQueueRequest = {
          page: state.pagination.page,
          pageSize: state.pagination.pageSize,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          filters: state.filters,
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

        const response = await fetch(`/api/v1/verification/assessments/queue?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch verification queue');
        }

        set({
          queue: data.data.queue,
          queueStats: data.data.queueStats,
          pagination: data.data.pagination,
          isLoading: false,
          error: null,
        });

      } catch (error) {
        console.error('Failed to fetch verification queue:', error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    },

    setFilters: (newFilters) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
        pagination: { ...state.pagination, page: 1 },
      }));
      
      // Auto-refresh queue with new filters
      get().fetchQueue();
    },

    setSorting: (sortBy, sortOrder) => {
      set({ sortBy, sortOrder });
      get().fetchQueue();
    },

    setPage: (page) => {
      set((state) => ({
        pagination: { ...state.pagination, page },
      }));
      get().fetchQueue();
    },

    toggleAssessmentSelection: (assessmentId) => {
      set((state) => {
        const isSelected = state.selectedAssessmentIds.includes(assessmentId);
        return {
          selectedAssessmentIds: isSelected
            ? state.selectedAssessmentIds.filter(id => id !== assessmentId)
            : [...state.selectedAssessmentIds, assessmentId],
        };
      });
    },

    selectAllVisible: () => {
      const { queue } = get();
      set({ selectedAssessmentIds: queue.map(item => item.assessment.id) });
    },

    clearSelection: () => {
      set({ selectedAssessmentIds: [] });
    },

    openPreview: (assessment) => {
      set({ previewAssessment: assessment, isPreviewOpen: true });
    },

    closePreview: () => {
      set({ previewAssessment: null, isPreviewOpen: false });
    },

    verifyAssessment: async (assessmentId, action, feedback) => {
      try {
        const response = await fetch(`/api/v1/verification/assessments/${assessmentId}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action, feedback }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Refresh queue after verification
        get().fetchQueue();
        
        // Remove from selection if it was selected
        set((state) => ({
          selectedAssessmentIds: state.selectedAssessmentIds.filter(id => id !== assessmentId),
        }));

      } catch (error) {
        console.error('Failed to verify assessment:', error);
        throw error;
      }
    },

    batchVerify: async (request) => {
      set({ 
        isBatchProcessing: true, 
        batchProgress: { processed: 0, total: request.assessmentIds.length, currentOperation: 'Starting batch verification...' } 
      });

      try {
        const response = await fetch('/api/v1/verification/assessments/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Batch verification failed');
        }

        // Update progress
        set({
          batchProgress: {
            processed: result.data.successful,
            total: request.assessmentIds.length,
            currentOperation: `Completed: ${result.data.successful}/${request.assessmentIds.length}`,
          },
        });

        // Refresh queue and clear selection
        await get().fetchQueue();
        get().clearSelection();

        if (result.data.failed > 0) {
          console.warn('Some assessments failed to verify:', result.data.errors);
        }

      } catch (error) {
        console.error('Batch verification failed:', error);
        throw error;
      } finally {
        set({ isBatchProcessing: false });
      }
    },

    getSelectedCount: () => get().selectedAssessmentIds.length,

    getHighPriorityCount: () => get().queueStats.highPriority,

    reset: () => set(initialState),
  }))
);

// Selector hooks for specific data
export const useQueueData = () => useVerificationStore((state) => ({
  queue: state.queue,
  queueStats: state.queueStats,
  pagination: state.pagination,
  isLoading: state.isLoading,
  error: state.error,
}));

export const useQueueFilters = () => useVerificationStore((state) => ({
  filters: state.filters,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
  setFilters: state.setFilters,
  setSorting: state.setSorting,
}));

export const useQueueSelection = () => useVerificationStore((state) => ({
  selectedAssessmentIds: state.selectedAssessmentIds,
  toggleAssessmentSelection: state.toggleAssessmentSelection,
  selectAllVisible: state.selectAllVisible,
  clearSelection: state.clearSelection,
  getSelectedCount: state.getSelectedCount,
}));

export const useAssessmentPreview = () => useVerificationStore((state) => ({
  isPreviewOpen: state.isPreviewOpen,
  previewAssessment: state.previewAssessment,
  openPreview: state.openPreview,
  closePreview: state.closePreview,
}));

export const useBatchOperations = () => useVerificationStore((state) => ({
  isBatchProcessing: state.isBatchProcessing,
  batchProgress: state.batchProgress,
  batchVerify: state.batchVerify,
}));