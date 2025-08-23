import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OfflineQueueItem, SyncStatus } from '@dms/shared';
import { OfflineQueueService } from '@/lib/services/OfflineQueueService';

interface QueueFilters {
  status?: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  type?: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA' | 'INCIDENT' | 'ENTITY';
}

interface QueueSummary {
  totalItems: number;
  pendingItems: number;
  failedItems: number;
  syncingItems: number;
  highPriorityItems: number;
  lastUpdated: Date;
  oldestPendingItem?: {
    id: string;
    type: string;
    createdAt: Date;
    priority: string;
  };
}

interface SyncState {
  // Queue management
  queue: OfflineQueueItem[];
  filteredQueue: OfflineQueueItem[];
  currentFilters: QueueFilters;
  queueSummary: QueueSummary | null;
  
  // UI state
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefresh: Date | null;
  error: string | null;
  
  // Auto-refresh
  autoRefreshEnabled: boolean;
  refreshInterval: number; // in milliseconds
  
  // Actions
  loadQueue: (filters?: QueueFilters) => Promise<void>;
  refreshQueue: () => Promise<void>;
  retryQueueItem: (id: string) => Promise<void>;
  removeQueueItem: (id: string) => Promise<void>;
  updateFilters: (filters: QueueFilters) => void;
  loadQueueSummary: () => Promise<void>;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  clearError: () => void;
}

// Helper function to determine queue item status based on error and retry count
const getQueueItemStatus = (item: OfflineQueueItem): 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED' => {
  if (item.error && item.retryCount > 0) return 'FAILED';
  if (item.retryCount > 0 && !item.error) return 'SYNCING';
  if (item.retryCount === 0 && !item.error) return 'PENDING';
  return 'SYNCED'; // Default case for synced items
};

// Helper function to filter queue items
const filterQueueItems = (items: OfflineQueueItem[], filters: QueueFilters): OfflineQueueItem[] => {
  return items.filter(item => {
    if (filters.status) {
      const itemStatus = getQueueItemStatus(item);
      if (itemStatus !== filters.status) return false;
    }
    
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.type && item.type !== filters.type) return false;
    
    return true;
  });
};

// Helper function to sort queue items by priority and creation date
const sortQueueItems = (items: OfflineQueueItem[]): OfflineQueueItem[] => {
  const priorityOrder = { HIGH: 3, NORMAL: 2, LOW: 1 };
  return [...items].sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

// Create queue service instance
const queueService = new OfflineQueueService();

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      // Initial state
      queue: [],
      filteredQueue: [],
      currentFilters: {},
      queueSummary: null,
      
      isLoading: false,
      isRefreshing: false,
      lastRefresh: null,
      error: null,
      
      autoRefreshEnabled: true,
      refreshInterval: 30000, // 30 seconds

      // Load queue with optional filters
      loadQueue: async (filters: QueueFilters = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const queueItems = await queueService.getQueueItems(filters);
          const sortedQueue = sortQueueItems(queueItems);
          const filteredQueue = filterQueueItems(sortedQueue, filters);
          
          set({
            queue: sortedQueue,
            filteredQueue,
            currentFilters: filters,
            lastRefresh: new Date(),
            isLoading: false,
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load queue';
          set({ error: errorMessage, isLoading: false });
          console.error('Queue load error:', error);
        }
      },

      // Refresh current queue with existing filters
      refreshQueue: async () => {
        const { currentFilters } = get();
        set({ isRefreshing: true });
        
        try {
          await get().loadQueue(currentFilters);
          set({ isRefreshing: false });
        } catch (error) {
          set({ isRefreshing: false });
        }
      },

      // Retry a failed queue item
      retryQueueItem: async (id: string) => {
        set({ error: null });
        
        try {
          await queueService.retryQueueItem(id);
          
          // Refresh queue to show updated status
          await get().refreshQueue();
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to retry queue item';
          set({ error: errorMessage });
          console.error('Queue retry error:', error);
        }
      },

      // Remove a queue item
      removeQueueItem: async (id: string) => {
        set({ error: null });
        
        try {
          await queueService.removeQueueItem(id);
          
          // Remove item from local state immediately for better UX
          const { queue, currentFilters } = get();
          const updatedQueue = queue.filter(item => item.id !== id);
          const filteredQueue = filterQueueItems(updatedQueue, currentFilters);
          
          set({
            queue: updatedQueue,
            filteredQueue,
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to remove queue item';
          set({ error: errorMessage });
          console.error('Queue remove error:', error);
        }
      },

      // Update filters and apply them
      updateFilters: (filters: QueueFilters) => {
        const { queue } = get();
        const filteredQueue = filterQueueItems(queue, filters);
        
        set({
          currentFilters: filters,
          filteredQueue,
        });
      },

      // Load queue summary for dashboard
      loadQueueSummary: async () => {
        try {
          const queueSummaryData = await queueService.getQueueSummary();
          const pendingItems = await queueService.getQueueItems({ status: 'PENDING' });
          
          // Find oldest pending item
          const oldestPendingItem = pendingItems.length > 0 
            ? pendingItems.reduce((oldest, current) => 
                new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest
              )
            : undefined;

          const summary: QueueSummary = {
            totalItems: queueSummaryData.total,
            pendingItems: queueSummaryData.pending,
            failedItems: queueSummaryData.failed,
            syncingItems: queueSummaryData.syncing,
            highPriorityItems: queueSummaryData.highPriority,
            lastUpdated: new Date(),
            oldestPendingItem: oldestPendingItem ? {
              id: oldestPendingItem.id,
              type: oldestPendingItem.type,
              createdAt: oldestPendingItem.createdAt,
              priority: oldestPendingItem.priority,
            } : undefined,
          };
          
          set({ queueSummary: summary });
          
        } catch (error) {
          console.error('Queue summary load error:', error);
          // Don't set error for summary failures as it's not critical
        }
      },

      // Auto-refresh controls
      setAutoRefresh: (enabled: boolean) => {
        set({ autoRefreshEnabled: enabled });
      },

      setRefreshInterval: (interval: number) => {
        set({ refreshInterval: interval });
      },

      // Clear error state
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'sync-storage',
      partialize: (state) => ({
        autoRefreshEnabled: state.autoRefreshEnabled,
        refreshInterval: state.refreshInterval,
        currentFilters: state.currentFilters,
      }),
    }
  )
);

// Hook for auto-refresh functionality
export function useAutoRefresh() {
  const { autoRefreshEnabled, refreshInterval, refreshQueue } = useSyncStore();
  
  if (typeof window !== 'undefined' && autoRefreshEnabled) {
    const interval = setInterval(() => {
      refreshQueue();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }
  
  return () => {};
}