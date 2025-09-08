/**
 * OptimisticUIManager - Core service for immediate UI feedback
 * 
 * Provides optimistic UI updates that give users immediate feedback while
 * sync operations are processed in the background. Integrates with existing
 * sync infrastructure and provides rollback capabilities for failed operations.
 */

import { v4 as uuidv4 } from 'uuid';
import type { PriorityQueueItem } from '@dms/shared';
import { OfflineQueueService } from '@/lib/services/OfflineQueueService';
import { syncEngine } from './SyncEngine';
import { useSyncStore } from '@/stores/sync.store';

// Optimistic Update Types
export interface OptimisticUpdate {
  id: string; // Unique optimistic update ID
  entityType: 'ASSESSMENT' | 'RESPONSE' | 'INCIDENT' | 'ENTITY';
  entityId: string; // Entity ID (temporary or permanent)
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  optimisticData: any; // Data to show immediately in UI
  originalData?: any; // Original data before update (for rollback)
  timestamp: Date;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'ROLLED_BACK';
  syncQueueId?: string; // Link to actual sync queue item
  retryCount: number;
  maxRetries: number;
  error?: string;
}

export interface OptimisticEntityState {
  entityId: string;
  entityType: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'SYNCING' | 'FAILED' | 'ROLLED_BACK';
  lastUpdate: Date;
  optimisticUpdateId?: string;
  errorMessage?: string;
  retryCount: number;
  canRetry: boolean;
  canRollback: boolean;
}

export interface RollbackOperation {
  updateId: string;
  entityId: string;
  entityType: string;
  reason: 'USER_INITIATED' | 'SYNC_FAILED' | 'VALIDATION_ERROR';
  rollbackData: any;
  confirmationRequired: boolean;
  confirmationMessage: string;
}

/**
 * OptimisticUIManager - Core service for optimistic updates
 */
export class OptimisticUIManager {
  private queueService: OfflineQueueService;
  private updateStore: Map<string, OptimisticUpdate> = new Map();
  private entityStateMap: Map<string, OptimisticEntityState> = new Map();
  
  constructor() {
    this.queueService = new OfflineQueueService();
  }

  /**
   * Apply optimistic update for immediate UI feedback
   */
  async applyOptimisticUpdate(
    entityType: OptimisticUpdate['entityType'],
    entityId: string,
    operation: OptimisticUpdate['operation'],
    optimisticData: any,
    originalData?: any
  ): Promise<string> {
    const updateId = uuidv4();
    const timestamp = new Date();

    // Create optimistic update record
    const update: OptimisticUpdate = {
      id: updateId,
      entityType,
      entityId,
      operation,
      optimisticData,
      originalData,
      timestamp,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3,
    };

    // Store update
    this.updateStore.set(updateId, update);

    // Update entity state
    this.updateEntityState(entityId, entityType, {
      syncStatus: 'PENDING',
      lastUpdate: timestamp,
      optimisticUpdateId: updateId,
      retryCount: 0,
      canRetry: true,
      canRollback: true,
    });

    // Update sync store immediately for UI feedback
    const syncStore = useSyncStore.getState();
    syncStore.applyOptimisticUpdate?.(update);

    // Queue the actual sync operation
    try {
      const queueItem: Partial<PriorityQueueItem> = {
        id: uuidv4(),
        type: entityType,
        action: operation.toLowerCase() as any,
        data: optimisticData,
        entityId,
        priority: 'NORMAL',
        priorityScore: this.calculateOptimisticPriority(operation, entityType),
        priorityReason: `Optimistic ${operation.toLowerCase()} operation`,
        createdAt: timestamp,
        retryCount: 0,
      };

      const syncQueueId = await this.queueService.addToQueue(queueItem as PriorityQueueItem);
      
      // Link optimistic update to sync queue item
      update.syncQueueId = syncQueueId;
      this.updateStore.set(updateId, update);

      // Start background sync processing
      this.processOptimisticUpdate(updateId);

    } catch (error) {
      console.error('Failed to queue optimistic update:', error);
      await this.markOptimisticUpdateFailed(updateId, error instanceof Error ? error.message : 'Queue failed');
    }

    return updateId;
  }

  /**
   * Process optimistic update in background
   */
  private async processOptimisticUpdate(updateId: string): Promise<void> {
    const update = this.updateStore.get(updateId);
    if (!update) {
      console.error('Optimistic update not found:', updateId);
      return;
    }

    try {
      // Update status to syncing
      await this.markOptimisticUpdateSyncing(updateId);

      // Perform actual sync through sync engine
      const result = await syncEngine.performSync('device-id', 'user-id', [update.optimisticData]);

      if (result.conflicts.length > 0) {
        // Handle conflicts - mark as failed for now, could be enhanced later
        await this.markOptimisticUpdateFailed(updateId, 'Sync conflict detected');
        return;
      }

      if (result.failed.length > 0) {
        // Handle sync failures
        await this.markOptimisticUpdateFailed(updateId, 'Sync operation failed');
        return;
      }

      // Success - confirm optimistic update
      await this.confirmOptimisticUpdate(updateId);

    } catch (error) {
      console.error('Error processing optimistic update:', error);
      await this.markOptimisticUpdateFailed(updateId, error instanceof Error ? error.message : 'Processing error');
    }
  }

  /**
   * Confirm optimistic update as successful
   */
  private async confirmOptimisticUpdate(updateId: string): Promise<void> {
    const update = this.updateStore.get(updateId);
    if (!update) return;

    // Update status
    update.status = 'CONFIRMED';
    this.updateStore.set(updateId, update);

    // Update entity state
    this.updateEntityState(update.entityId, update.entityType, {
      syncStatus: 'SYNCED',
      lastUpdate: new Date(),
      optimisticUpdateId: undefined,
      errorMessage: undefined,
      retryCount: 0,
      canRetry: false,
      canRollback: false,
    });

    // Update sync store
    const syncStore = useSyncStore.getState();
    syncStore.confirmOptimisticUpdate?.(updateId);

    // Clean up old confirmed updates after delay
    setTimeout(() => {
      this.cleanupOptimisticUpdate(updateId);
    }, 30000); // 30 seconds
  }

  /**
   * Mark optimistic update as syncing
   */
  private async markOptimisticUpdateSyncing(updateId: string): Promise<void> {
    const update = this.updateStore.get(updateId);
    if (!update) return;

    update.status = 'PENDING'; // Keep as pending during sync
    this.updateStore.set(updateId, update);

    this.updateEntityState(update.entityId, update.entityType, {
      syncStatus: 'SYNCING',
      lastUpdate: new Date(),
      canRetry: false, // Can't retry while syncing
    });
  }

  /**
   * Mark optimistic update as failed
   */
  private async markOptimisticUpdateFailed(updateId: string, errorMessage: string): Promise<void> {
    const update = this.updateStore.get(updateId);
    if (!update) return;

    update.status = 'FAILED';
    update.error = errorMessage;
    update.retryCount++;
    this.updateStore.set(updateId, update);

    const canRetry = update.retryCount < update.maxRetries;

    this.updateEntityState(update.entityId, update.entityType, {
      syncStatus: 'FAILED',
      lastUpdate: new Date(),
      errorMessage,
      retryCount: update.retryCount,
      canRetry,
      canRollback: true,
    });

    // Update sync store
    const syncStore = useSyncStore.getState();
    syncStore.rollbackOptimisticUpdate?.(updateId);
  }

  /**
   * Rollback optimistic update
   */
  async rollbackOptimisticUpdate(updateId: string, reason: RollbackOperation['reason'] = 'USER_INITIATED'): Promise<void> {
    const update = this.updateStore.get(updateId);
    if (!update) {
      throw new Error(`Optimistic update ${updateId} not found`);
    }

    if (update.status === 'CONFIRMED') {
      throw new Error('Cannot rollback confirmed optimistic update');
    }

    // Update status
    update.status = 'ROLLED_BACK';
    this.updateStore.set(updateId, update);

    // Restore original data if available
    if (update.originalData && update.operation === 'UPDATE') {
      // For updates, restore the original data
      this.updateEntityState(update.entityId, update.entityType, {
        syncStatus: 'SYNCED',
        lastUpdate: new Date(),
        optimisticUpdateId: undefined,
        errorMessage: undefined,
        retryCount: 0,
        canRetry: false,
        canRollback: false,
      });
    } else if (update.operation === 'CREATE') {
      // For creates, remove the optimistic entity
      this.entityStateMap.delete(`${update.entityType}:${update.entityId}`);
    }

    // Update sync store
    const syncStore = useSyncStore.getState();
    syncStore.rollbackOptimisticUpdate?.(updateId);

    // Remove from sync queue if not yet processed
    if (update.syncQueueId) {
      try {
        await this.queueService.removeQueueItem(update.syncQueueId);
      } catch (error) {
        console.warn('Failed to remove queue item during rollback:', error);
      }
    }

    // Log rollback for audit
    console.info('Optimistic update rolled back', {
      updateId,
      entityId: update.entityId,
      entityType: update.entityType,
      reason,
      operation: update.operation,
    });
  }

  /**
   * Retry failed optimistic update
   */
  async retryOptimisticUpdate(updateId: string): Promise<void> {
    const update = this.updateStore.get(updateId);
    if (!update) {
      throw new Error(`Optimistic update ${updateId} not found`);
    }

    if (update.status !== 'FAILED') {
      throw new Error('Can only retry failed optimistic updates');
    }

    if (update.retryCount >= update.maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    // Reset status to pending
    update.status = 'PENDING';
    update.error = undefined;
    this.updateStore.set(updateId, update);

    // Update entity state
    this.updateEntityState(update.entityId, update.entityType, {
      syncStatus: 'PENDING',
      lastUpdate: new Date(),
      errorMessage: undefined,
      canRetry: true,
    });

    // Retry processing
    await this.processOptimisticUpdate(updateId);
  }

  /**
   * Get optimistic update by ID
   */
  getOptimisticUpdate(updateId: string): OptimisticUpdate | undefined {
    return this.updateStore.get(updateId);
  }

  /**
   * Get entity state
   */
  getEntityState(entityId: string, entityType: string): OptimisticEntityState | undefined {
    return this.entityStateMap.get(`${entityType}:${entityId}`);
  }

  /**
   * Get all pending optimistic updates
   */
  getPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.updateStore.values())
      .filter(update => update.status === 'PENDING')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get all failed optimistic updates
   */
  getFailedUpdates(): OptimisticUpdate[] {
    return Array.from(this.updateStore.values())
      .filter(update => update.status === 'FAILED')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Rollback all failed optimistic updates
   */
  async rollbackAllFailed(): Promise<number> {
    const failedUpdates = this.getFailedUpdates();
    let rolledBackCount = 0;

    for (const update of failedUpdates) {
      try {
        await this.rollbackOptimisticUpdate(update.id, 'SYNC_FAILED');
        rolledBackCount++;
      } catch (error) {
        console.error('Failed to rollback update:', update.id, error);
      }
    }

    return rolledBackCount;
  }

  /**
   * Clean up confirmed optimistic updates
   */
  private cleanupOptimisticUpdate(updateId: string): void {
    const update = this.updateStore.get(updateId);
    if (update && update.status === 'CONFIRMED') {
      this.updateStore.delete(updateId);
    }
  }

  /**
   * Update entity state
   */
  private updateEntityState(
    entityId: string, 
    entityType: string, 
    updates: Partial<OptimisticEntityState>
  ): void {
    const key = `${entityType}:${entityId}`;
    const existing = this.entityStateMap.get(key) || {
      entityId,
      entityType,
      syncStatus: 'SYNCED' as const,
      lastUpdate: new Date(),
      retryCount: 0,
      canRetry: false,
      canRollback: false,
    };

    this.entityStateMap.set(key, { ...existing, ...updates });
  }

  /**
   * Calculate priority score for optimistic operations
   */
  private calculateOptimisticPriority(operation: string, entityType: string): number {
    let baseScore = 50; // Base priority for optimistic updates

    // Higher priority for critical operations
    if (operation === 'CREATE') baseScore += 20;
    if (operation === 'UPDATE') baseScore += 10;
    if (operation === 'DELETE') baseScore += 30;

    // Higher priority for critical entity types
    if (entityType === 'INCIDENT') baseScore += 30;
    if (entityType === 'ASSESSMENT') baseScore += 20;
    if (entityType === 'RESPONSE') baseScore += 15;

    return Math.min(baseScore, 100); // Cap at 100
  }

  /**
   * Get optimistic update statistics
   */
  getOptimisticStats(): {
    totalUpdates: number;
    pendingUpdates: number;
    confirmedUpdates: number;
    failedUpdates: number;
    rolledBackUpdates: number;
  } {
    const updates = Array.from(this.updateStore.values());
    
    return {
      totalUpdates: updates.length,
      pendingUpdates: updates.filter(u => u.status === 'PENDING').length,
      confirmedUpdates: updates.filter(u => u.status === 'CONFIRMED').length,
      failedUpdates: updates.filter(u => u.status === 'FAILED').length,
      rolledBackUpdates: updates.filter(u => u.status === 'ROLLED_BACK').length,
    };
  }
}

// Export singleton instance
export const optimisticUIManager = new OptimisticUIManager();