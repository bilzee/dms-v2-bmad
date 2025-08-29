import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OfflineQueueItem, SyncStatus, PriorityQueueItem, PriorityRule, PriorityQueueStats, ConnectivityStatus, BackgroundSyncSettings, BackgroundSyncProgress } from '@dms/shared';
import { OfflineQueueService } from '@/lib/services/OfflineQueueService';
import { priorityEventLogger } from '@/lib/services/PriorityEventLogger';
import { backgroundSyncManager } from '@/lib/sync/BackgroundSyncManager';
import { connectivityDetector } from '@/lib/sync/ConnectivityDetector';
import { syncEngine, type ConflictDetailed, type ConflictResolution } from '@/lib/sync/SyncEngine';
import { db } from '@/lib/offline/db';
import { optimisticUIManager, type OptimisticUpdate, type OptimisticEntityState } from '@/lib/sync/optimistic';

interface QueueFilters {
  status?: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  type?: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA' | 'INCIDENT' | 'ENTITY';
  priorityScoreRange?: { min: number; max: number };
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

interface ConflictFilters {
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  entityType?: 'ASSESSMENT' | 'RESPONSE' | 'INCIDENT' | 'ENTITY';
  conflictType?: 'TIMESTAMP' | 'FIELD_LEVEL' | 'CONCURRENT_EDIT';
  status?: 'PENDING' | 'RESOLVED' | 'ESCALATED';
}

interface ConflictStats {
  totalConflicts: number;
  pendingConflicts: number;
  resolvedConflicts: number;
  criticalConflicts: number;
  conflictsByType: Record<string, number>;
  conflictsBySeverity: Record<string, number>;
}

interface SyncState {
  // Queue management
  queue: PriorityQueueItem[];
  filteredQueue: PriorityQueueItem[];
  priorityQueue: PriorityQueueItem[]; // Separate priority-ordered queue
  currentFilters: QueueFilters;
  queueSummary: QueueSummary | null;
  priorityStats: PriorityQueueStats | null;
  
  // Priority rule management
  priorityRules: PriorityRule[];
  isLoadingRules: boolean;
  
  // Background sync state
  connectivityStatus: ConnectivityStatus | null;
  backgroundSyncSettings: BackgroundSyncSettings | null;
  backgroundSyncProgress: BackgroundSyncProgress | null;
  backgroundSyncEnabled: boolean;
  
  // Conflict management state
  conflicts: ConflictDetailed[];
  filteredConflicts: ConflictDetailed[];
  currentConflictFilters: ConflictFilters;
  conflictStats: ConflictStats | null;
  selectedConflict: ConflictDetailed | null;
  isResolvingConflict: boolean;
  
  // UI state
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefresh: Date | null;
  error: string | null;
  
  // Auto-refresh
  autoRefreshEnabled: boolean;
  refreshInterval: number; // in milliseconds
  
  // Optimistic update state
  optimisticUpdates: Map<string, OptimisticUpdate>;
  pendingOperations: Set<string>; // Entity IDs with pending operations
  rollbackInProgress: boolean;
  
  // Actions
  loadQueue: (filters?: QueueFilters) => Promise<void>;
  loadPriorityQueue: () => Promise<void>; // Load priority-ordered queue
  refreshQueue: () => Promise<void>;
  retryQueueItem: (id: string) => Promise<void>;
  removeQueueItem: (id: string) => Promise<void>;
  updateFilters: (filters: QueueFilters) => void;
  loadQueueSummary: () => Promise<void>;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  clearError: () => void;
  
  // Priority management actions
  loadPriorityRules: () => Promise<void>;
  createPriorityRule: (rule: Omit<PriorityRule, 'id' | 'createdAt'>) => Promise<void>;
  updatePriorityRule: (id: string, rule: Partial<PriorityRule>) => Promise<void>;
  deletePriorityRule: (id: string) => Promise<void>;
  overridePriority: (itemId: string, newPriority: number, justification: string) => Promise<void>;
  recalculatePriorities: () => Promise<void>;
  loadPriorityStats: () => Promise<void>;
  
  // Background sync management actions
  loadBackgroundSyncSettings: () => Promise<void>;
  updateBackgroundSyncSettings: (settings: Partial<BackgroundSyncSettings>) => Promise<void>;
  triggerBackgroundSync: () => Promise<void>;
  pauseBackgroundSync: () => void;
  resumeBackgroundSync: () => void;
  updateConnectivityStatus: (status: ConnectivityStatus) => void;
  updateBackgroundSyncProgress: (progress: BackgroundSyncProgress | null) => void;
  
  // Conflict management actions
  loadConflicts: (filters?: ConflictFilters) => Promise<void>;
  refreshConflicts: () => Promise<void>;
  updateConflictFilters: (filters: ConflictFilters) => void;
  selectConflict: (conflict: ConflictDetailed | null) => void;
  resolveConflict: (conflictId: string, resolution: ConflictResolution, mergedData?: any, justification?: string) => Promise<void>;
  loadConflictStats: () => Promise<void>;
  getConflictsForEntity: (entityId: string) => Promise<ConflictDetailed[]>;
  clearOldConflicts: (daysOld?: number) => Promise<number>;
  
  // Optimistic update actions
  applyOptimisticUpdate: (update: OptimisticUpdate) => void;
  confirmOptimisticUpdate: (updateId: string) => void;
  rollbackOptimisticUpdate: (updateId: string) => Promise<void>;
  rollbackAllFailed: () => Promise<void>;
  retryOptimisticUpdate: (updateId: string) => Promise<void>;
  getOptimisticEntityState: (entityId: string, entityType: string) => OptimisticEntityState | undefined;
  getOptimisticStats: () => {
    totalUpdates: number;
    pendingUpdates: number;
    confirmedUpdates: number;
    failedUpdates: number;
    rolledBackUpdates: number;
  };
}

// Helper function to determine queue item status based on error and retry count
const getQueueItemStatus = (item: PriorityQueueItem): 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED' => {
  if (item.error && item.retryCount > 0) return 'FAILED';
  if (item.retryCount > 0 && !item.error) return 'SYNCING';
  if (item.retryCount === 0 && !item.error) return 'PENDING';
  return 'SYNCED'; // Default case for synced items
};

// Helper function to filter queue items
const filterQueueItems = (items: PriorityQueueItem[], filters: QueueFilters): PriorityQueueItem[] => {
  return items.filter(item => {
    if (filters.status) {
      const itemStatus = getQueueItemStatus(item);
      if (itemStatus !== filters.status) return false;
    }
    
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.type && item.type !== filters.type) return false;
    
    // New priority score range filtering
    if (filters.priorityScoreRange) {
      const score = item.priorityScore || 0;
      if (score < filters.priorityScoreRange.min || score > filters.priorityScoreRange.max) {
        return false;
      }
    }
    
    return true;
  });
};

// Helper function to sort queue items by priority score and creation date
const sortQueueItems = (items: PriorityQueueItem[]): PriorityQueueItem[] => {
  return [...items].sort((a, b) => {
    // First sort by priority score (higher scores first)
    const scoreDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    
    // Then by creation date (newer first for same score)
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
      priorityQueue: [],
      currentFilters: {},
      queueSummary: null,
      priorityStats: null,
      
      // Priority rule management
      priorityRules: [],
      isLoadingRules: false,
      
      // Background sync state
      connectivityStatus: null,
      backgroundSyncSettings: null,
      backgroundSyncProgress: null,
      backgroundSyncEnabled: false,
      
      // Optimistic update state
      optimisticUpdates: new Map(),
      pendingOperations: new Set(),
      rollbackInProgress: false,
      
      // Conflict management state
      conflicts: [],
      filteredConflicts: [],
      currentConflictFilters: {},
      conflictStats: null,
      selectedConflict: null,
      isResolvingConflict: false,
      
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
          // Convert OfflineQueueItem[] to PriorityQueueItem[] with defaults
          const priorityQueueItems = queueItems.map(item => ({
            ...item,
            priorityScore: 'priorityScore' in item ? item.priorityScore : 0,
            priorityReason: 'priorityReason' in item ? item.priorityReason : 'Standard priority'
          })) as PriorityQueueItem[];
          const sortedQueue = sortQueueItems(priorityQueueItems);
          const filteredQueue = filterQueueItems(sortedQueue, filters);
          
          set({
            queue: sortedQueue,
            filteredQueue,
            priorityQueue: sortedQueue, // Keep priority queue in sync
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

      // Load priority queue separately for priority visualization
      loadPriorityQueue: async () => {
        set({ error: null });
        
        try {
          const response = await fetch('/api/v1/sync/priority/queue');
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to load priority queue');
          }
          
          // Sort by priority score (highest first)
          const priorityQueue = sortQueueItems(result.data.items || []);
          
          set({ priorityQueue });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load priority queue';
          set({ error: errorMessage });
          console.error('Priority queue load error:', error);
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

      // Priority management actions
      loadPriorityRules: async () => {
        set({ isLoadingRules: true, error: null });
        
        try {
          const response = await fetch('/api/v1/sync/priority/rules');
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to load priority rules');
          }
          
          set({
            priorityRules: result.data,
            isLoadingRules: false,
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load priority rules';
          set({ error: errorMessage, isLoadingRules: false });
          console.error('Priority rules load error:', error);
        }
      },

      createPriorityRule: async (rule: Omit<PriorityRule, 'id' | 'createdAt'>) => {
        set({ error: null });
        
        try {
          const response = await fetch('/api/v1/sync/priority/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule),
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to create priority rule');
          }
          
          // Reload rules to get the updated list
          await get().loadPriorityRules();
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create priority rule';
          set({ error: errorMessage });
          console.error('Priority rule creation error:', error);
        }
      },

      updatePriorityRule: async (id: string, rule: Partial<PriorityRule>) => {
        set({ error: null });
        
        try {
          const response = await fetch(`/api/v1/sync/priority/rules/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule),
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to update priority rule');
          }
          
          // Reload rules to get the updated list
          await get().loadPriorityRules();
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update priority rule';
          set({ error: errorMessage });
          console.error('Priority rule update error:', error);
        }
      },

      deletePriorityRule: async (id: string) => {
        set({ error: null });
        
        try {
          const response = await fetch(`/api/v1/sync/priority/rules/${id}`, {
            method: 'DELETE',
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to delete priority rule');
          }
          
          // Reload rules to get the updated list
          await get().loadPriorityRules();
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete priority rule';
          set({ error: errorMessage });
          console.error('Priority rule deletion error:', error);
        }
      },

      overridePriority: async (itemId: string, newPriority: number, justification: string) => {
        set({ error: null });
        
        try {
          // Find the current item to get old priority
          const { queue } = get();
          const currentItem = queue.find(item => item.id === itemId);
          const oldPriority = currentItem?.priorityScore || 0;
          
          const response = await fetch('/api/v1/sync/priority/override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId,
              newPriority,
              justification,
              coordinatorId: 'current-user-id', // TODO: Get from auth context
            }),
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to override priority');
          }

          // Log the priority override event
          if (currentItem) {
            priorityEventLogger.logPriorityOverride(
              itemId,
              currentItem.type as 'ASSESSMENT' | 'RESPONSE' | 'MEDIA',
              oldPriority,
              newPriority,
              justification,
              'current-user-id', // TODO: Get from auth context
              'coordinator'
            );
          }
          
          // Refresh queue to show updated priorities
          await get().refreshQueue();
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to override priority';
          set({ error: errorMessage });
          console.error('Priority override error:', error);
        }
      },

      recalculatePriorities: async () => {
        set({ error: null });
        
        try {
          const response = await fetch('/api/v1/sync/priority/recalculate', {
            method: 'PUT',
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to recalculate priorities');
          }
          
          // Refresh queue to show updated priorities
          await get().refreshQueue();
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to recalculate priorities';
          set({ error: errorMessage });
          console.error('Priority recalculation error:', error);
        }
      },

      loadPriorityStats: async () => {
        try {
          const response = await fetch('/api/v1/sync/priority/queue');
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to load priority stats');
          }
          
          set({ priorityStats: result.data.stats });
          
        } catch (error) {
          console.error('Priority stats load error:', error);
          // Don't set error for stats failures as it's not critical
        }
      },

      // Background sync management actions
      loadBackgroundSyncSettings: async () => {
        try {
          const response = await fetch('/api/v1/sync/background/settings');
          const result = await response.json();
          
          if (response.ok) {
            set({ backgroundSyncSettings: result.data });
          }
        } catch (error) {
          console.error('Failed to load background sync settings:', error);
        }
      },

      updateBackgroundSyncSettings: async (newSettings: Partial<BackgroundSyncSettings>) => {
        set({ error: null });
        
        try {
          const response = await fetch('/api/v1/sync/background/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings),
          });
          
          const result = await response.json();
          
          if (response.ok) {
            set({ backgroundSyncSettings: result.data.settings });
            // Also update the manager directly
            backgroundSyncManager.updateSettings(newSettings);
          } else {
            throw new Error(result.error || 'Failed to update background sync settings');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
          set({ error: errorMessage });
          throw error;
        }
      },

      triggerBackgroundSync: async () => {
        set({ error: null });
        
        try {
          const response = await fetch('/api/v1/sync/background/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'manual_trigger_from_ui' }),
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to trigger background sync');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to trigger sync';
          set({ error: errorMessage });
          throw error;
        }
      },

      pauseBackgroundSync: () => {
        backgroundSyncManager.pause();
      },

      resumeBackgroundSync: () => {
        backgroundSyncManager.resume();
      },

      updateConnectivityStatus: (status: ConnectivityStatus) => {
        set({ connectivityStatus: status });
      },

      updateBackgroundSyncProgress: (progress: BackgroundSyncProgress | null) => {
        set({ backgroundSyncProgress: progress });
      },

      // Conflict management actions
      loadConflicts: async (filters: ConflictFilters = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          // Load conflicts from local database and sync engine
          let localConflicts = await db.getPendingConflicts({
            entityType: filters.entityType,
            severity: filters.severity,
            conflictType: filters.conflictType
          });
          
          // Merge with sync engine conflicts
          const engineConflicts = syncEngine.getPendingConflicts();
          
          // Combine and deduplicate conflicts
          const allConflicts = [...localConflicts, ...engineConflicts];
          const uniqueConflicts = allConflicts.filter((conflict, index, arr) => 
            arr.findIndex(c => c.id === conflict.id) === index
          );
          
          // Apply additional filters
          let filteredConflicts = uniqueConflicts;
          if (filters.status) {
            filteredConflicts = filteredConflicts.filter(c => c.status === filters.status);
          }
          
          // Sort by severity and detection time
          const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          filteredConflicts.sort((a, b) => {
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0) return severityDiff;
            return b.detectedAt.getTime() - a.detectedAt.getTime();
          });
          
          set({
            conflicts: uniqueConflicts,
            filteredConflicts,
            currentConflictFilters: filters,
            lastRefresh: new Date(),
            isLoading: false
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load conflicts';
          set({ error: errorMessage, isLoading: false });
          console.error('Conflict load error:', error);
        }
      },

      refreshConflicts: async () => {
        const { currentConflictFilters } = get();
        set({ isRefreshing: true });
        
        try {
          await get().loadConflicts(currentConflictFilters);
          set({ isRefreshing: false });
        } catch (error) {
          set({ isRefreshing: false });
        }
      },

      updateConflictFilters: (filters: ConflictFilters) => {
        const { conflicts } = get();
        let filteredConflicts = conflicts;
        
        // Apply filters
        if (filters.severity) {
          filteredConflicts = filteredConflicts.filter(c => c.severity === filters.severity);
        }
        if (filters.entityType) {
          filteredConflicts = filteredConflicts.filter(c => c.entityType === filters.entityType);
        }
        if (filters.conflictType) {
          filteredConflicts = filteredConflicts.filter(c => c.conflictType === filters.conflictType);
        }
        if (filters.status) {
          filteredConflicts = filteredConflicts.filter(c => c.status === filters.status);
        }
        
        set({
          currentConflictFilters: filters,
          filteredConflicts
        });
      },

      selectConflict: (conflict: ConflictDetailed | null) => {
        set({ selectedConflict: conflict });
      },

      resolveConflict: async (
        conflictId: string, 
        resolution: ConflictResolution, 
        mergedData?: any, 
        justification: string = ''
      ) => {
        set({ isResolvingConflict: true, error: null });
        
        try {
          // Get current user ID (would normally come from auth context)
          const coordinatorId = 'current-coordinator-id'; // TODO: Get from auth
          
          // Resolve through sync engine
          await syncEngine.resolveConflict(
            conflictId,
            resolution,
            mergedData,
            coordinatorId,
            justification
          );
          
          // Update local database
          await db.updateConflictResolution(
            conflictId,
            resolution,
            coordinatorId,
            justification
          );
          
          // Refresh conflicts list
          await get().refreshConflicts();
          await get().loadConflictStats();
          
          // Clear selection if it was the resolved conflict
          const { selectedConflict } = get();
          if (selectedConflict?.id === conflictId) {
            set({ selectedConflict: null });
          }
          
          set({ isResolvingConflict: false });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to resolve conflict';
          set({ error: errorMessage, isResolvingConflict: false });
          console.error('Conflict resolution error:', error);
          throw error;
        }
      },

      loadConflictStats: async () => {
        try {
          // Load stats from both sources
          const localStats = await db.getConflictStats();
          const engineStats = syncEngine.getConflictStats();
          
          // Combine stats (prioritize engine stats as they're more current)
          const combinedStats = {
            totalConflicts: Math.max(localStats.totalConflicts, engineStats.totalConflicts),
            pendingConflicts: Math.max(localStats.pendingConflicts, engineStats.pendingConflicts),
            resolvedConflicts: Math.max(localStats.resolvedConflicts, engineStats.resolvedConflicts),
            criticalConflicts: Math.max(localStats.criticalConflicts, engineStats.criticalConflicts),
            conflictsByType: { ...localStats.conflictsByType, ...engineStats.conflictsByType },
            conflictsBySeverity: { ...localStats.conflictsBySeverity, ...engineStats.conflictsBySeverity }
          };
          
          set({ conflictStats: combinedStats });
          
        } catch (error) {
          console.error('Failed to load conflict stats:', error);
          // Don't set error for stats failures as it's not critical
        }
      },

      getConflictsForEntity: async (entityId: string) => {
        try {
          // Get from both sources
          const localConflicts = await db.getConflictsForEntity(entityId);
          const engineConflicts = syncEngine.getConflictsForEntity(entityId);
          
          // Combine and deduplicate
          const allConflicts = [...localConflicts, ...engineConflicts];
          return allConflicts.filter((conflict, index, arr) => 
            arr.findIndex(c => c.id === conflict.id) === index
          );
          
        } catch (error) {
          console.error('Failed to get conflicts for entity:', error);
          return [];
        }
      },

      clearOldConflicts: async (daysOld: number = 30) => {
        try {
          // Clear from both sources
          const engineCleared = syncEngine.clearOldConflicts(daysOld);
          const dbCleared = await db.clearOldConflicts(daysOld);
          
          // Refresh stats after cleanup
          await get().loadConflictStats();
          
          return Math.max(engineCleared, dbCleared);
          
        } catch (error) {
          console.error('Failed to clear old conflicts:', error);
          return 0;
        }
      },

      // Optimistic update actions
      applyOptimisticUpdate: (update: OptimisticUpdate) => {
        const { optimisticUpdates, pendingOperations } = get();
        const newOptimisticUpdates = new Map(optimisticUpdates);
        const newPendingOperations = new Set(pendingOperations);
        
        newOptimisticUpdates.set(update.id, update);
        newPendingOperations.add(update.entityId);
        
        set({
          optimisticUpdates: newOptimisticUpdates,
          pendingOperations: newPendingOperations
        });
      },

      confirmOptimisticUpdate: (updateId: string) => {
        const { optimisticUpdates, pendingOperations } = get();
        const update = optimisticUpdates.get(updateId);
        
        if (update) {
          const newOptimisticUpdates = new Map(optimisticUpdates);
          const newPendingOperations = new Set(pendingOperations);
          
          // Remove from pending operations if no other pending updates for this entity
          const hasPendingUpdates = Array.from(optimisticUpdates.values())
            .some(u => u.entityId === update.entityId && u.id !== updateId && u.status === 'PENDING');
          
          if (!hasPendingUpdates) {
            newPendingOperations.delete(update.entityId);
          }
          
          // Remove confirmed update after short delay
          setTimeout(() => {
            newOptimisticUpdates.delete(updateId);
            set({ optimisticUpdates: new Map(newOptimisticUpdates) });
          }, 5000);
          
          set({
            optimisticUpdates: newOptimisticUpdates,
            pendingOperations: newPendingOperations
          });
        }
      },

      rollbackOptimisticUpdate: async (updateId: string) => {
        set({ rollbackInProgress: true });
        
        try {
          await optimisticUIManager.rollbackOptimisticUpdate(updateId);
          
          const { optimisticUpdates, pendingOperations } = get();
          const update = optimisticUpdates.get(updateId);
          
          if (update) {
            const newOptimisticUpdates = new Map(optimisticUpdates);
            const newPendingOperations = new Set(pendingOperations);
            
            newOptimisticUpdates.delete(updateId);
            
            // Remove from pending operations if no other pending updates for this entity
            const hasPendingUpdates = Array.from(optimisticUpdates.values())
              .some(u => u.entityId === update.entityId && u.id !== updateId);
            
            if (!hasPendingUpdates) {
              newPendingOperations.delete(update.entityId);
            }
            
            set({
              optimisticUpdates: newOptimisticUpdates,
              pendingOperations: newPendingOperations
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
          set({ error: errorMessage });
          console.error('Rollback error:', error);
        } finally {
          set({ rollbackInProgress: false });
        }
      },

      rollbackAllFailed: async () => {
        set({ rollbackInProgress: true, error: null });
        
        try {
          const rolledBackCount = await optimisticUIManager.rollbackAllFailed();
          
          // Clear all failed updates from store
          const { optimisticUpdates, pendingOperations } = get();
          const newOptimisticUpdates = new Map(optimisticUpdates);
          const newPendingOperations = new Set();
          
          // Remove failed updates
          for (const [id, update] of optimisticUpdates.entries()) {
            if (update.status === 'FAILED' || update.status === 'ROLLED_BACK') {
              newOptimisticUpdates.delete(id);
            } else {
              newPendingOperations.add(update.entityId);
            }
          }
          
          set({
            optimisticUpdates: newOptimisticUpdates,
            pendingOperations: newPendingOperations
          });
          
          return rolledBackCount;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Rollback all failed';
          set({ error: errorMessage });
          console.error('Rollback all error:', error);
          throw error;
        } finally {
          set({ rollbackInProgress: false });
        }
      },

      retryOptimisticUpdate: async (updateId: string) => {
        set({ error: null });
        
        try {
          await optimisticUIManager.retryOptimisticUpdate(updateId);
          
          // Update store state
          const { optimisticUpdates, pendingOperations } = get();
          const update = optimisticUpdates.get(updateId);
          
          if (update) {
            const newOptimisticUpdates = new Map(optimisticUpdates);
            const newPendingOperations = new Set(pendingOperations);
            
            // Reset update status to pending
            const updatedUpdate = { ...update, status: 'PENDING' as const, error: undefined };
            newOptimisticUpdates.set(updateId, updatedUpdate);
            newPendingOperations.add(update.entityId);
            
            set({
              optimisticUpdates: newOptimisticUpdates,
              pendingOperations: newPendingOperations
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Retry failed';
          set({ error: errorMessage });
          console.error('Retry error:', error);
        }
      },

      getOptimisticEntityState: (entityId: string, entityType: string) => {
        return optimisticUIManager.getEntityState(entityId, entityType);
      },

      getOptimisticStats: () => {
        return optimisticUIManager.getOptimisticStats();
      },
    }),
    {
      name: 'sync-storage',
      partialize: (state) => ({
        autoRefreshEnabled: state.autoRefreshEnabled,
        refreshInterval: state.refreshInterval,
        currentFilters: state.currentFilters,
        backgroundSyncEnabled: state.backgroundSyncEnabled,
        backgroundSyncSettings: state.backgroundSyncSettings,
        currentConflictFilters: state.currentConflictFilters,
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