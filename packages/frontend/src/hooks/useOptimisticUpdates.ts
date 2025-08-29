/**
 * useOptimisticUpdates - Custom hook for optimistic UI updates
 * 
 * Provides a React hook interface for applying optimistic updates with
 * immediate UI feedback, automatic rollback on failure, and integration
 * with the existing sync infrastructure.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/sync.store';
import { optimisticUIManager, type OptimisticUpdate } from '@/lib/sync/optimistic';

export interface UseOptimisticUpdatesOptions {
  entityType: OptimisticUpdate['entityType'];
  entityId?: string;
  autoRetry?: boolean;
  maxRetries?: number;
  onSuccess?: (updateId: string) => void;
  onError?: (updateId: string, error: string) => void;
  onRollback?: (updateId: string) => void;
}

export interface UseOptimisticUpdatesReturn {
  // State
  isPending: boolean;
  isRollingBack: boolean;
  entityState: any;
  pendingUpdates: OptimisticUpdate[];
  stats: {
    totalUpdates: number;
    pendingUpdates: number;
    confirmedUpdates: number;
    failedUpdates: number;
    rolledBackUpdates: number;
  };

  // Actions
  applyOptimisticUpdate: (
    entityId: string,
    operation: OptimisticUpdate['operation'],
    optimisticData: any,
    originalData?: any
  ) => Promise<string>;
  
  retryUpdate: (updateId: string) => Promise<void>;
  rollbackUpdate: (updateId: string) => Promise<void>;
  rollbackAllFailed: () => Promise<number>;
  
  // Helpers
  getUpdateStatus: (updateId: string) => OptimisticUpdate['status'] | undefined;
  hasActiveUpdates: () => boolean;
  getFailedUpdates: () => OptimisticUpdate[];
}

export function useOptimisticUpdates({
  entityType,
  entityId,
  autoRetry = false,
  maxRetries = 3,
  onSuccess,
  onError,
  onRollback,
}: UseOptimisticUpdatesOptions): UseOptimisticUpdatesReturn {
  const {
    optimisticUpdates,
    pendingOperations,
    rollbackInProgress,
    retryOptimisticUpdate,
    rollbackOptimisticUpdate,
    rollbackAllFailed,
    getOptimisticEntityState,
    getOptimisticStats,
  } = useSyncStore();

  const [lastProcessedUpdates, setLastProcessedUpdates] = useState<Set<string>>(new Set());

  // Monitor update status changes for callbacks
  useEffect(() => {
    const updates = Array.from(optimisticUpdates.values());
    const currentUpdateIds = new Set(updates.map(u => u.id));

    // Check for status changes
    updates.forEach(update => {
      if (update.entityType === entityType && (!entityId || update.entityId === entityId)) {
        const wasProcessed = lastProcessedUpdates.has(update.id);
        
        if (update.status === 'CONFIRMED' && !wasProcessed) {
          onSuccess?.(update.id);
        } else if (update.status === 'FAILED' && !wasProcessed) {
          onError?.(update.id, update.error || 'Unknown error');
          
          // Auto-retry logic
          if (autoRetry && update.retryCount < maxRetries) {
            setTimeout(() => {
              retryUpdate(update.id).catch(console.error);
            }, Math.pow(2, update.retryCount) * 1000); // Exponential backoff
          }
        } else if (update.status === 'ROLLED_BACK' && !wasProcessed) {
          onRollback?.(update.id);
        }
      }
    });

    setLastProcessedUpdates(currentUpdateIds);
  }, [optimisticUpdates, entityType, entityId, onSuccess, onError, onRollback, autoRetry, maxRetries]);

  // Filter updates for this entity type/ID
  const getRelevantUpdates = useCallback(() => {
    return Array.from(optimisticUpdates.values()).filter(update => {
      const matchesType = update.entityType === entityType;
      const matchesId = !entityId || update.entityId === entityId;
      return matchesType && matchesId;
    });
  }, [optimisticUpdates, entityType, entityId]);

  const applyOptimisticUpdate = useCallback(async (
    targetEntityId: string,
    operation: OptimisticUpdate['operation'],
    optimisticData: any,
    originalData?: any
  ): Promise<string> => {
    try {
      const updateId = await optimisticUIManager.applyOptimisticUpdate(
        entityType,
        targetEntityId,
        operation,
        optimisticData,
        originalData
      );
      
      return updateId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply optimistic update';
      console.error('Optimistic update error:', error);
      throw new Error(errorMessage);
    }
  }, [entityType]);

  const retryUpdate = useCallback(async (updateId: string): Promise<void> => {
    try {
      await retryOptimisticUpdate(updateId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry update';
      console.error('Retry error:', error);
      throw new Error(errorMessage);
    }
  }, [retryOptimisticUpdate]);

  const rollbackUpdate = useCallback(async (updateId: string): Promise<void> => {
    try {
      await rollbackOptimisticUpdate(updateId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rollback update';
      console.error('Rollback error:', error);
      throw new Error(errorMessage);
    }
  }, [rollbackOptimisticUpdate]);

  const getUpdateStatus = useCallback((updateId: string): OptimisticUpdate['status'] | undefined => {
    return optimisticUpdates.get(updateId)?.status;
  }, [optimisticUpdates]);

  const hasActiveUpdates = useCallback((): boolean => {
    const updates = getRelevantUpdates();
    return updates.some(update => update.status === 'PENDING' || update.status === 'FAILED');
  }, [getRelevantUpdates]);

  const getFailedUpdates = useCallback((): OptimisticUpdate[] => {
    const updates = getRelevantUpdates();
    return updates.filter(update => update.status === 'FAILED');
  }, [getRelevantUpdates]);

  // Calculate derived state
  const isPending = entityId ? pendingOperations.has(entityId) : getRelevantUpdates().some(u => u.status === 'PENDING');
  const entityState = entityId ? getOptimisticEntityState(entityId, entityType) : null;
  const pendingUpdates = getRelevantUpdates().filter(u => u.status === 'PENDING');
  const stats = getOptimisticStats();

  return {
    // State
    isPending,
    isRollingBack: rollbackInProgress,
    entityState,
    pendingUpdates,
    stats,

    // Actions
    applyOptimisticUpdate,
    retryUpdate,
    rollbackUpdate,
    rollbackAllFailed,

    // Helpers
    getUpdateStatus,
    hasActiveUpdates,
    getFailedUpdates,
  };
}

// Hook for monitoring sync status across all entities
export function useSyncStatus() {
  const {
    optimisticUpdates,
    pendingOperations,
    rollbackInProgress,
    connectivityStatus,
    backgroundSyncProgress,
    queueSummary,
    isRefreshing,
    getOptimisticStats,
  } = useSyncStore();

  const stats = getOptimisticStats();
  const isOnline = connectivityStatus?.isOnline ?? true;
  const totalPending = stats.pendingUpdates + (queueSummary?.pendingItems || 0);
  const totalFailed = stats.failedUpdates + (queueSummary?.failedItems || 0);

  return {
    // Status
    isOnline,
    isSyncing: isRefreshing || rollbackInProgress || !!backgroundSyncProgress,
    totalPending,
    totalFailed,
    
    // Stats
    optimisticStats: stats,
    queueSummary,
    backgroundSyncProgress,
    
    // State
    rollbackInProgress,
  };
}

// Hook for rollback operations
export function useRollback() {
  const {
    rollbackOptimisticUpdate,
    rollbackAllFailed,
    rollbackInProgress,
  } = useSyncStore();

  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    updateId?: string;
    reason?: 'USER_INITIATED' | 'SYNC_FAILED' | 'VALIDATION_ERROR';
    onConfirm?: () => void;
  }>({ isOpen: false });

  const showRollbackConfirmation = useCallback((
    updateId: string,
    reason: 'USER_INITIATED' | 'SYNC_FAILED' | 'VALIDATION_ERROR' = 'USER_INITIATED'
  ) => {
    setConfirmationDialog({
      isOpen: true,
      updateId,
      reason,
      onConfirm: () => {
        rollbackOptimisticUpdate(updateId)
          .catch(console.error)
          .finally(() => setConfirmationDialog({ isOpen: false }));
      },
    });
  }, [rollbackOptimisticUpdate]);

  const closeConfirmation = useCallback(() => {
    setConfirmationDialog({ isOpen: false });
  }, []);

  const rollbackAll = useCallback(async (): Promise<number> => {
    try {
      return await rollbackAllFailed();
    } catch (error) {
      console.error('Failed to rollback all:', error);
      throw error;
    }
  }, [rollbackAllFailed]);

  return {
    // State
    rollbackInProgress,
    confirmationDialog,
    
    // Actions
    showRollbackConfirmation,
    closeConfirmation,
    rollbackUpdate: rollbackOptimisticUpdate,
    rollbackAll,
  };
}