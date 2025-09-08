import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  AssessmentVerificationQueueItem, 
  ResponseVerificationQueueItem,
  VerificationQueueFilters,
  ResponseVerificationQueueFilters,
  VerificationQueueRequest,
  ResponseVerificationQueueRequest,
  BatchVerificationRequest,
  RapidAssessment,
  RapidResponse,
  AutoApprovalConfig,
  AutoApprovalRule,
  AutoApprovalOverrideRequest,
  AutoApprovalStatsResponse,
  PhotoVerificationData,
  ResponseVerificationMetrics,
  MediaAttachment
} from '@dms/shared';

interface VerificationState {
  // Assessment Queue Data
  queue: AssessmentVerificationQueueItem[];
  queueStats: {
    totalPending: number;
    highPriority: number;
    requiresAttention: number;
    byAssessmentType: Record<string, number>;
  };
  
  // Response Queue Data
  responseQueue: ResponseVerificationQueueItem[];
  responseQueueStats: {
    totalPending: number;
    highPriority: number;
    requiresAttention: number;
    byResponseType: Record<string, number>;
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
  selectedResponseIds: string[];
  isPreviewOpen: boolean;
  previewAssessment: RapidAssessment | null;
  previewResponse: RapidResponse | null;
  
  // Filters and Sorting
  filters: VerificationQueueFilters;
  responseFilters: ResponseVerificationQueueFilters;
  sortBy: 'priority' | 'date' | 'type' | 'assessor';
  responseSortBy: 'priority' | 'date' | 'type' | 'responder';
  sortOrder: 'asc' | 'desc';
  responseSortOrder: 'asc' | 'desc';

  // Batch Operations
  isBatchProcessing: boolean;
  batchProgress: {
    processed: number;
    total: number;
    currentOperation: string;
  };

  // Assessment Queue Actions
  fetchQueue: (request?: Partial<VerificationQueueRequest>) => Promise<void>;
  setFilters: (filters: Partial<VerificationQueueFilters>) => void;
  setSorting: (sortBy: 'priority' | 'date' | 'type' | 'assessor', sortOrder: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  
  // Response Queue Actions
  fetchResponseQueue: (request?: Partial<ResponseVerificationQueueRequest>) => Promise<void>;
  setResponseFilters: (filters: Partial<ResponseVerificationQueueFilters>) => void;
  setResponseSorting: (sortBy: 'priority' | 'date' | 'type' | 'responder', sortOrder: 'asc' | 'desc') => void;
  setResponsePage: (page: number) => void;
  
  // Selection
  toggleAssessmentSelection: (assessmentId: string) => void;
  toggleResponseSelection: (responseId: string) => void;
  selectAllVisible: () => void;
  selectAllResponsesVisible: () => void;
  clearSelection: () => void;
  clearResponseSelection: () => void;
  
  // Preview
  openPreview: (assessment: RapidAssessment) => void;
  openResponsePreview: (response: RapidResponse) => void;
  closePreview: () => void;
  
  // Verification Actions
  verifyAssessment: (assessmentId: string, action: 'APPROVE' | 'REJECT', feedback?: any) => Promise<void>;
  batchVerify: (request: BatchVerificationRequest) => Promise<void>;
  
  // Story 3.2: Assessment Approval/Rejection Actions
  approveAssessment: (assessmentId: string, approvalData: any) => Promise<void>;
  rejectAssessment: (assessmentId: string, rejectionData: any) => Promise<void>;
  batchApprove: (assessmentIds: string[], approvalData: any) => Promise<void>;
  batchReject: (assessmentIds: string[], rejectionData: any) => Promise<void>;
  
  // Story 3.3: Response Approval/Rejection Actions
  approveResponse: (responseId: string, approvalData: any) => Promise<void>;
  rejectResponse: (responseId: string, rejectionData: any) => Promise<void>;
  batchApproveResponses: (responseIds: string[], approvalData: any) => Promise<void>;
  batchRejectResponses: (responseIds: string[], rejectionData: any) => Promise<void>;

  // Story 3.4: Auto-Approval Configuration
  autoApprovalConfig: AutoApprovalConfig | null;
  autoApprovalStats: AutoApprovalStatsResponse['data'] | null;
  isLoadingAutoApproval: boolean;
  autoApprovalError: string | null;
  
  // Auto-Approval Actions
  fetchAutoApprovalConfig: () => Promise<void>;
  saveAutoApprovalConfig: (config: AutoApprovalConfig) => Promise<void>;
  fetchAutoApprovalStats: (timeRange?: string) => Promise<void>;
  testAutoApprovalRules: (rules: AutoApprovalRule[]) => Promise<any>;
  overrideAutoApprovals: (request: AutoApprovalOverrideRequest) => Promise<void>;

  // Story 3.5: Response Verification State
  currentResponseVerification: RapidResponse | null;
  photoVerifications: Record<string, PhotoVerificationData>;
  responseMetrics: ResponseVerificationMetrics | null;
  deliveryComparison: any | null; // Planned vs actual comparison data
  isLoadingResponseVerification: boolean;
  responseVerificationError: string | null;
  
  // Extended Response Verification State
  responseVerifications: {
    [responseId: string]: {
      photoVerifications: PhotoVerificationData[];
      metricsValidation: ResponseVerificationMetrics | null;
      verifierNotes: string;
      isComplete: boolean;
    }
  };

  // Story 3.5: Response Verification Actions
  loadResponsePhotos: (responseId: string) => Promise<MediaAttachment[]>;
  annotatePhoto: (photoId: string, annotation: Partial<PhotoVerificationData>) => Promise<void>;
  validatePhotoMetadata: (photoId: string) => Promise<PhotoVerificationData>;
  compareDeliveryMetrics: (responseId: string) => Promise<ResponseVerificationMetrics>;
  completeResponseVerification: (responseId: string, verificationData: any) => Promise<void>;
  
  // Enhanced Response Verification Actions
  setResponsePhotoVerification: (responseId: string, photoId: string, verification: PhotoVerificationData) => void;
  setResponseMetricsValidation: (responseId: string, metrics: ResponseVerificationMetrics) => void;
  setResponseVerifierNotes: (responseId: string, notes: string) => void;
  
  // Utility
  reset: () => void;
  getSelectedCount: () => number;
  getSelectedResponseCount: () => number;
  getHighPriorityCount: () => number;
  getResponseHighPriorityCount: () => number;
}

const initialState = {
  queue: [],
  queueStats: {
    totalPending: 0,
    highPriority: 0,
    requiresAttention: 0,
    byAssessmentType: {},
  },
  responseQueue: [],
  responseQueueStats: {
    totalPending: 0,
    highPriority: 0,
    requiresAttention: 0,
    byResponseType: {},
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
  selectedResponseIds: [],
  isPreviewOpen: false,
  previewAssessment: null,
  previewResponse: null,
  filters: {},
  responseFilters: {},
  sortBy: 'priority' as const,
  responseSortBy: 'priority' as const,
  sortOrder: 'desc' as const,
  responseSortOrder: 'desc' as const,
  isBatchProcessing: false,
  batchProgress: {
    processed: 0,
    total: 0,
    currentOperation: '',
  },
  // Auto-Approval State
  autoApprovalConfig: null,
  autoApprovalStats: null,
  isLoadingAutoApproval: false,
  autoApprovalError: null,
  
  // Story 3.5: Response Verification State
  currentResponseVerification: null,
  photoVerifications: {},
  responseMetrics: null,
  deliveryComparison: null,
  isLoadingResponseVerification: false,
  responseVerificationError: null,
  
  // Extended Response Verification State
  responseVerifications: {},
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

    // Story 3.2: Approval/Rejection Actions
    approveAssessment: async (assessmentId, approvalData) => {
      try {
        const response = await fetch(`/api/v1/verification/assessments/${assessmentId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(approvalData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to approve assessment');
        }

        // Refresh queue and remove from selection
        await get().fetchQueue();
        set((state) => ({
          selectedAssessmentIds: state.selectedAssessmentIds.filter(id => id !== assessmentId),
        }));

      } catch (error) {
        console.error('Failed to approve assessment:', error);
        throw error;
      }
    },

    rejectAssessment: async (assessmentId, rejectionData) => {
      try {
        const response = await fetch(`/api/v1/verification/assessments/${assessmentId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rejectionData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to reject assessment');
        }

        // Refresh queue and remove from selection
        await get().fetchQueue();
        set((state) => ({
          selectedAssessmentIds: state.selectedAssessmentIds.filter(id => id !== assessmentId),
        }));

      } catch (error) {
        console.error('Failed to reject assessment:', error);
        throw error;
      }
    },

    batchApprove: async (assessmentIds, approvalData) => {
      set({ 
        isBatchProcessing: true, 
        batchProgress: { processed: 0, total: assessmentIds.length, currentOperation: 'Starting batch approval...' } 
      });

      try {
        const response = await fetch('/api/v1/verification/assessments/batch-approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentIds,
            ...approvalData,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Batch approval failed');
        }

        // Update progress
        set({
          batchProgress: {
            processed: result.data.approved,
            total: assessmentIds.length,
            currentOperation: `Approved: ${result.data.approved}/${assessmentIds.length}`,
          },
        });

        // Refresh queue and clear selection
        await get().fetchQueue();
        get().clearSelection();

        if (result.data.failed > 0) {
          console.warn('Some assessments failed to approve:', result.data.results);
        }

      } catch (error) {
        console.error('Batch approval failed:', error);
        throw error;
      } finally {
        set({ isBatchProcessing: false });
      }
    },

    batchReject: async (assessmentIds, rejectionData) => {
      set({ 
        isBatchProcessing: true, 
        batchProgress: { processed: 0, total: assessmentIds.length, currentOperation: 'Starting batch rejection...' } 
      });

      try {
        const response = await fetch('/api/v1/verification/assessments/batch-reject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentIds,
            ...rejectionData,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Batch rejection failed');
        }

        // Update progress
        set({
          batchProgress: {
            processed: result.data.rejected,
            total: assessmentIds.length,
            currentOperation: `Rejected: ${result.data.rejected}/${assessmentIds.length}`,
          },
        });

        // Refresh queue and clear selection
        await get().fetchQueue();
        get().clearSelection();

        if (result.data.failed > 0) {
          console.warn('Some assessments failed to reject:', result.data.results);
        }

      } catch (error) {
        console.error('Batch rejection failed:', error);
        throw error;
      } finally {
        set({ isBatchProcessing: false });
      }
    },

    // Response Queue Actions
    fetchResponseQueue: async (request?: Partial<ResponseVerificationQueueRequest>) => {
      const state = get();
      set({ isLoading: true, error: null });

      try {
        const params = new URLSearchParams();
        
        const finalRequest: ResponseVerificationQueueRequest = {
          page: state.pagination.page,
          pageSize: state.pagination.pageSize,
          sortBy: state.responseSortBy,
          sortOrder: state.responseSortOrder,
          filters: state.responseFilters,
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

        const response = await fetch(`/api/v1/verification/responses/queue?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch response verification queue');
        }

        set({
          responseQueue: data.data.queue,
          responseQueueStats: data.data.queueStats,
          pagination: data.data.pagination,
          isLoading: false,
          error: null,
        });

      } catch (error) {
        console.error('Failed to fetch response verification queue:', error);
        set({ 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    },

    setResponseFilters: (newFilters) => {
      set((state) => ({
        responseFilters: { ...state.responseFilters, ...newFilters },
        pagination: { ...state.pagination, page: 1 },
      }));
      
      // Auto-refresh queue with new filters
      get().fetchResponseQueue();
    },

    setResponseSorting: (sortBy, sortOrder) => {
      set({ responseSortBy: sortBy, responseSortOrder: sortOrder });
      get().fetchResponseQueue();
    },

    setResponsePage: (page) => {
      set((state) => ({
        pagination: { ...state.pagination, page },
      }));
      get().fetchResponseQueue();
    },

    // Response Selection
    toggleResponseSelection: (responseId) => {
      set((state) => {
        const isSelected = state.selectedResponseIds.includes(responseId);
        return {
          selectedResponseIds: isSelected
            ? state.selectedResponseIds.filter(id => id !== responseId)
            : [...state.selectedResponseIds, responseId],
        };
      });
    },

    selectAllResponsesVisible: () => {
      const { responseQueue } = get();
      set({ selectedResponseIds: responseQueue.map(item => item.response.id) });
    },

    clearResponseSelection: () => {
      set({ selectedResponseIds: [] });
    },

    // Response Preview
    openResponsePreview: (response) => {
      set({ previewResponse: response, isPreviewOpen: true });
    },

    // Response Approval/Rejection Actions
    approveResponse: async (responseId, approvalData) => {
      try {
        const response = await fetch(`/api/v1/verification/responses/${responseId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(approvalData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to approve response');
        }

        // Refresh queue and remove from selection
        await get().fetchResponseQueue();
        set((state) => ({
          selectedResponseIds: state.selectedResponseIds.filter(id => id !== responseId),
        }));

      } catch (error) {
        console.error('Failed to approve response:', error);
        throw error;
      }
    },

    rejectResponse: async (responseId, rejectionData) => {
      try {
        const response = await fetch(`/api/v1/verification/responses/${responseId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rejectionData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to reject response');
        }

        // Refresh queue and remove from selection
        await get().fetchResponseQueue();
        set((state) => ({
          selectedResponseIds: state.selectedResponseIds.filter(id => id !== responseId),
        }));

      } catch (error) {
        console.error('Failed to reject response:', error);
        throw error;
      }
    },

    batchApproveResponses: async (responseIds, approvalData) => {
      set({ 
        isBatchProcessing: true, 
        batchProgress: { processed: 0, total: responseIds.length, currentOperation: 'Starting batch approval...' } 
      });

      try {
        const response = await fetch('/api/v1/verification/responses/batch-approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            responseIds,
            ...approvalData,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Batch approval failed');
        }

        // Update progress
        set({
          batchProgress: {
            processed: result.data.approved,
            total: responseIds.length,
            currentOperation: `Approved: ${result.data.approved}/${responseIds.length}`,
          },
        });

        // Refresh queue and clear selection
        await get().fetchResponseQueue();
        get().clearResponseSelection();

        if (result.data.failed > 0) {
          console.warn('Some responses failed to approve:', result.data.results);
        }

      } catch (error) {
        console.error('Batch approval failed:', error);
        throw error;
      } finally {
        set({ isBatchProcessing: false });
      }
    },

    batchRejectResponses: async (responseIds, rejectionData) => {
      set({ 
        isBatchProcessing: true, 
        batchProgress: { processed: 0, total: responseIds.length, currentOperation: 'Starting batch rejection...' } 
      });

      try {
        const response = await fetch('/api/v1/verification/responses/batch-reject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            responseIds,
            ...rejectionData,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Batch rejection failed');
        }

        // Update progress
        set({
          batchProgress: {
            processed: result.data.rejected,
            total: responseIds.length,
            currentOperation: `Rejected: ${result.data.rejected}/${responseIds.length}`,
          },
        });

        // Refresh queue and clear selection
        await get().fetchResponseQueue();
        get().clearResponseSelection();

        if (result.data.failed > 0) {
          console.warn('Some responses failed to reject:', result.data.results);
        }

      } catch (error) {
        console.error('Batch rejection failed:', error);
        throw error;
      } finally {
        set({ isBatchProcessing: false });
      }
    },

    // Story 3.4: Auto-Approval Configuration Actions
    fetchAutoApprovalConfig: async () => {
      set({ isLoadingAutoApproval: true, autoApprovalError: null });

      try {
        const response = await fetch('/api/v1/config/auto-approval/rules');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch auto-approval configuration');
        }

        set({
          autoApprovalConfig: data.data.config,
          isLoadingAutoApproval: false,
          autoApprovalError: null,
        });

      } catch (error) {
        console.error('Failed to fetch auto-approval configuration:', error);
        set({ 
          isLoadingAutoApproval: false, 
          autoApprovalError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    },

    saveAutoApprovalConfig: async (config: AutoApprovalConfig) => {
      set({ isLoadingAutoApproval: true, autoApprovalError: null });

      try {
        const response = await fetch('/api/v1/config/auto-approval/rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rules: config.rules,
            globalSettings: config.globalSettings,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to save auto-approval configuration');
        }

        // Update local state with saved configuration
        set({
          autoApprovalConfig: {
            ...config,
            lastUpdated: new Date(),
          },
          isLoadingAutoApproval: false,
          autoApprovalError: null,
        });

      } catch (error) {
        console.error('Failed to save auto-approval configuration:', error);
        set({ 
          isLoadingAutoApproval: false, 
          autoApprovalError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    fetchAutoApprovalStats: async (timeRange = '24h') => {
      set({ isLoadingAutoApproval: true, autoApprovalError: null });

      try {
        const params = new URLSearchParams({ timeRange });
        const response = await fetch(`/api/v1/verification/auto-approval/stats?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch auto-approval statistics');
        }

        set({
          autoApprovalStats: data.data,
          isLoadingAutoApproval: false,
          autoApprovalError: null,
        });

      } catch (error) {
        console.error('Failed to fetch auto-approval statistics:', error);
        set({ 
          isLoadingAutoApproval: false, 
          autoApprovalError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    },

    testAutoApprovalRules: async (rules: AutoApprovalRule[]) => {
      set({ isLoadingAutoApproval: true, autoApprovalError: null });

      try {
        const response = await fetch('/api/v1/verification/auto-approval/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rules,
            sampleSize: 50,
            targetType: 'BOTH',
            useHistoricalData: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to test auto-approval rules');
        }

        set({ 
          isLoadingAutoApproval: false, 
          autoApprovalError: null 
        });

        return result.data;

      } catch (error) {
        console.error('Failed to test auto-approval rules:', error);
        set({ 
          isLoadingAutoApproval: false, 
          autoApprovalError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    overrideAutoApprovals: async (request: AutoApprovalOverrideRequest) => {
      set({ isLoadingAutoApproval: true, autoApprovalError: null });

      try {
        const response = await fetch('/api/v1/verification/auto-approval/override', {
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
          throw new Error(result.error || 'Failed to override auto-approvals');
        }

        // Refresh verification queues to reflect changes
        await get().fetchQueue();
        await get().fetchResponseQueue();

        set({ 
          isLoadingAutoApproval: false, 
          autoApprovalError: null 
        });

        return result.data;

      } catch (error) {
        console.error('Failed to override auto-approvals:', error);
        set({ 
          isLoadingAutoApproval: false, 
          autoApprovalError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    // Story 3.5: Response Verification Actions
    loadResponsePhotos: async (responseId: string) => {
      set({ isLoadingResponseVerification: true, responseVerificationError: null });

      try {
        const response = await fetch(`/api/v1/verification/responses/${responseId}/photos`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load response photos');
        }

        set({
          isLoadingResponseVerification: false,
          responseVerificationError: null,
        });

        return data.data.photos;

      } catch (error) {
        console.error('Failed to load response photos:', error);
        set({ 
          isLoadingResponseVerification: false, 
          responseVerificationError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    annotatePhoto: async (photoId: string, annotation: Partial<PhotoVerificationData>) => {
      set((state) => ({
        photoVerifications: {
          ...state.photoVerifications,
          [photoId]: {
            ...state.photoVerifications[photoId],
            ...annotation,
          },
        },
      }));

      // In a real implementation, this would also sync to the backend
      try {
        const response = await fetch(`/api/v1/verification/photos/${photoId}/annotate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(annotation),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to sync photo annotation:', error);
        // Could implement retry logic or show warning to user
      }
    },

    validatePhotoMetadata: async (photoId: string) => {
      set({ isLoadingResponseVerification: true, responseVerificationError: null });

      try {
        const response = await fetch(`/api/v1/verification/photos/${photoId}/validate`, {
          method: 'POST',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to validate photo metadata');
        }

        const verification = data.data.verification;
        
        set((state) => ({
          photoVerifications: {
            ...state.photoVerifications,
            [photoId]: verification,
          },
          isLoadingResponseVerification: false,
          responseVerificationError: null,
        }));

        return verification;

      } catch (error) {
        console.error('Failed to validate photo metadata:', error);
        set({ 
          isLoadingResponseVerification: false, 
          responseVerificationError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    compareDeliveryMetrics: async (responseId: string) => {
      set({ isLoadingResponseVerification: true, responseVerificationError: null });

      try {
        const response = await fetch(`/api/v1/verification/responses/${responseId}/delivery-comparison`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to compare delivery metrics');
        }

        const metrics = data.data;
        
        set({
          responseMetrics: metrics,
          deliveryComparison: data.data.comparison,
          isLoadingResponseVerification: false,
          responseVerificationError: null,
        });

        return metrics;

      } catch (error) {
        console.error('Failed to compare delivery metrics:', error);
        set({ 
          isLoadingResponseVerification: false, 
          responseVerificationError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    completeResponseVerification: async (responseId: string, verificationData: any) => {
      set({ isLoadingResponseVerification: true, responseVerificationError: null });

      try {
        const response = await fetch(`/api/v1/verification/responses/${responseId}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...verificationData,
            photoVerifications: get().photoVerifications,
            responseMetrics: get().responseMetrics,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to complete response verification');
        }

        // Clear verification state
        set({
          currentResponseVerification: null,
          photoVerifications: {},
          responseMetrics: null,
          deliveryComparison: null,
          isLoadingResponseVerification: false,
          responseVerificationError: null,
        });

        // Refresh response queue
        await get().fetchResponseQueue();

        return result.data;

      } catch (error) {
        console.error('Failed to complete response verification:', error);
        set({ 
          isLoadingResponseVerification: false, 
          responseVerificationError: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
        throw error;
      }
    },

    // Enhanced Response Verification Actions
    setResponsePhotoVerification: (responseId: string, photoId: string, verification: PhotoVerificationData) => {
      set((state) => ({
        responseVerifications: {
          ...state.responseVerifications,
          [responseId]: {
            photoVerifications: [
              ...(state.responseVerifications[responseId]?.photoVerifications || []).filter(p => p.photoId !== photoId),
              verification
            ],
            metricsValidation: state.responseVerifications[responseId]?.metricsValidation || null,
            verifierNotes: state.responseVerifications[responseId]?.verifierNotes || '',
            isComplete: state.responseVerifications[responseId]?.isComplete || false,
          }
        }
      }));
    },

    setResponseMetricsValidation: (responseId: string, metrics: ResponseVerificationMetrics) => {
      set((state) => ({
        responseVerifications: {
          ...state.responseVerifications,
          [responseId]: {
            photoVerifications: state.responseVerifications[responseId]?.photoVerifications || [],
            metricsValidation: metrics,
            verifierNotes: state.responseVerifications[responseId]?.verifierNotes || '',
            isComplete: state.responseVerifications[responseId]?.isComplete || false,
          }
        }
      }));
    },

    setResponseVerifierNotes: (responseId: string, notes: string) => {
      set((state) => ({
        responseVerifications: {
          ...state.responseVerifications,
          [responseId]: {
            photoVerifications: state.responseVerifications[responseId]?.photoVerifications || [],
            metricsValidation: state.responseVerifications[responseId]?.metricsValidation || null,
            verifierNotes: notes,
            isComplete: state.responseVerifications[responseId]?.isComplete || false,
          }
        }
      }));
    },

    // Utility functions
    getSelectedResponseCount: () => get().selectedResponseIds.length,
    getResponseHighPriorityCount: () => get().responseQueueStats.highPriority,

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

// Response verification selector hooks
export const useResponseQueueData = () => useVerificationStore((state) => ({
  responseQueue: state.responseQueue,
  responseQueueStats: state.responseQueueStats,
  pagination: state.pagination,
  isLoading: state.isLoading,
  error: state.error,
}));

export const useResponseQueueFilters = () => useVerificationStore((state) => ({
  filters: state.responseFilters,
  sortBy: state.responseSortBy,
  sortOrder: state.responseSortOrder,
  setFilters: state.setResponseFilters,
  setSorting: state.setResponseSorting,
}));

export const useResponseQueueSelection = () => useVerificationStore((state) => ({
  selectedResponseIds: state.selectedResponseIds,
  toggleResponseSelection: state.toggleResponseSelection,
  selectAllVisible: state.selectAllResponsesVisible,
  clearResponseSelection: state.clearResponseSelection,
  getSelectedCount: state.getSelectedResponseCount,
}));

export const useResponsePreview = () => useVerificationStore((state) => ({
  isPreviewOpen: state.isPreviewOpen,
  previewResponse: state.previewResponse,
  openPreview: state.openResponsePreview,
  closePreview: state.closePreview,
}));

export const useResponseBatchOperations = () => useVerificationStore((state) => ({
  isBatchProcessing: state.isBatchProcessing,
  batchProgress: state.batchProgress,
  batchApproveResponses: state.batchApproveResponses,
  batchRejectResponses: state.batchRejectResponses,
}));

// Auto-approval selector hooks
export const useAutoApprovalConfig = () => useVerificationStore((state) => ({
  config: state.autoApprovalConfig,
  isLoading: state.isLoadingAutoApproval,
  error: state.autoApprovalError,
  fetchConfig: state.fetchAutoApprovalConfig,
  saveConfig: state.saveAutoApprovalConfig,
}));

export const useAutoApprovalStats = () => useVerificationStore((state) => ({
  stats: state.autoApprovalStats,
  isLoading: state.isLoadingAutoApproval,
  error: state.autoApprovalError,
  fetchStats: state.fetchAutoApprovalStats,
}));

export const useAutoApprovalActions = () => useVerificationStore((state) => ({
  testRules: state.testAutoApprovalRules,
  overrideApprovals: state.overrideAutoApprovals,
  isLoading: state.isLoadingAutoApproval,
  error: state.autoApprovalError,
}));