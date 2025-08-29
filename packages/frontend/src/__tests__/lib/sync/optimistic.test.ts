/**
 * OptimisticUIManager Tests
 * 
 * Comprehensive test suite for the OptimisticUIManager service including
 * optimistic updates, rollback functionality, error handling, and integration
 * with sync infrastructure.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { OptimisticUIManager, type OptimisticUpdate } from '@/lib/sync/optimistic';

// Mock dependencies
jest.mock('@/lib/services/OfflineQueueService');
jest.mock('@/lib/sync/SyncEngine');
jest.mock('@/stores/sync.store');

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('OptimisticUIManager', () => {
  let optimisticUIManager: OptimisticUIManager;
  let mockQueueService: any;
  let mockSyncStore: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock OfflineQueueService
    mockQueueService = {
      addToQueue: jest.fn().mockResolvedValue('queue-item-123'),
      removeQueueItem: jest.fn().mockResolvedValue(undefined),
    };

    // Mock sync store
    mockSyncStore = {
      applyOptimisticUpdate: jest.fn(),
      confirmOptimisticUpdate: jest.fn(),
      rollbackOptimisticUpdate: jest.fn(),
    };

    // Mock the store getter
    (require('@/stores/sync.store') as any).useSyncStore = {
      getState: jest.fn().mockReturnValue(mockSyncStore),
    };

    optimisticUIManager = new OptimisticUIManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('applyOptimisticUpdate', () => {
    it('should apply optimistic update and return update ID', async () => {
      const updateId = await optimisticUIManager.applyOptimisticUpdate(
        'ASSESSMENT',
        'entity-123',
        'CREATE',
        { name: 'Test Assessment' },
        null
      );

      expect(updateId).toBe('test-uuid-123');
      expect(mockQueueService.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ASSESSMENT',
          operation: 'create',
          entityId: 'entity-123',
          priority: 'NORMAL',
        })
      );
      expect(mockSyncStore.applyOptimisticUpdate).toHaveBeenCalled();
    });

    it('should calculate correct priority score for different operations', async () => {
      // Test CREATE operation
      await optimisticUIManager.applyOptimisticUpdate(
        'INCIDENT',
        'entity-123',
        'CREATE',
        { name: 'Test Incident' }
      );

      expect(mockQueueService.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priorityScore: 100, // Base 50 + CREATE 20 + INCIDENT 30 = 100 (capped)
        })
      );

      // Test UPDATE operation
      await optimisticUIManager.applyOptimisticUpdate(
        'RESPONSE',
        'entity-456',
        'UPDATE',
        { name: 'Test Response' }
      );

      expect(mockQueueService.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priorityScore: 75, // Base 50 + UPDATE 10 + RESPONSE 15 = 75
        })
      );
    });

    it('should handle queue service errors gracefully', async () => {
      mockQueueService.addToQueue.mockRejectedValue(new Error('Queue failed'));

      const updateId = await optimisticUIManager.applyOptimisticUpdate(
        'ASSESSMENT',
        'entity-123',
        'CREATE',
        { name: 'Test Assessment' }
      );

      expect(updateId).toBe('test-uuid-123');
      // Should still apply optimistic update even if queue fails
      expect(mockSyncStore.applyOptimisticUpdate).toHaveBeenCalled();
    });
  });

  describe('rollbackOptimisticUpdate', () => {
    beforeEach(async () => {
      // Create an optimistic update first
      await optimisticUIManager.applyOptimisticUpdate(
        'ASSESSMENT',
        'entity-123',
        'CREATE',
        { name: 'Test Assessment' }
      );
    });

    it('should rollback optimistic update successfully', async () => {
      await optimisticUIManager.rollbackOptimisticUpdate('test-uuid-123');

      const update = optimisticUIManager.getOptimisticUpdate('test-uuid-123');
      expect(update?.status).toBe('ROLLED_BACK');
      expect(mockSyncStore.rollbackOptimisticUpdate).toHaveBeenCalledWith('test-uuid-123');
    });

    it('should remove queue item during rollback', async () => {
      await optimisticUIManager.rollbackOptimisticUpdate('test-uuid-123');

      expect(mockQueueService.removeQueueItem).toHaveBeenCalledWith('queue-item-123');
    });

    it('should throw error for non-existent update', async () => {
      await expect(
        optimisticUIManager.rollbackOptimisticUpdate('non-existent-id')
      ).rejects.toThrow('Optimistic update non-existent-id not found');
    });

    it('should throw error when trying to rollback confirmed update', async () => {
      // Manually set update as confirmed
      const update = optimisticUIManager.getOptimisticUpdate('test-uuid-123');
      if (update) {
        update.status = 'CONFIRMED';
      }

      await expect(
        optimisticUIManager.rollbackOptimisticUpdate('test-uuid-123')
      ).rejects.toThrow('Cannot rollback confirmed optimistic update');
    });
  });

  describe('retryOptimisticUpdate', () => {
    beforeEach(async () => {
      // Create a failed optimistic update
      await optimisticUIManager.applyOptimisticUpdate(
        'ASSESSMENT',
        'entity-123',
        'CREATE',
        { name: 'Test Assessment' }
      );
      
      // Manually set it as failed
      const update = optimisticUIManager.getOptimisticUpdate('test-uuid-123');
      if (update) {
        update.status = 'FAILED';
        update.error = 'Sync failed';
        update.retryCount = 1;
      }
    });

    it('should retry failed optimistic update', async () => {
      await optimisticUIManager.retryOptimisticUpdate('test-uuid-123');

      const update = optimisticUIManager.getOptimisticUpdate('test-uuid-123');
      expect(update?.status).toBe('PENDING');
      expect(update?.error).toBeUndefined();
    });

    it('should throw error for non-existent update', async () => {
      await expect(
        optimisticUIManager.retryOptimisticUpdate('non-existent-id')
      ).rejects.toThrow('Optimistic update non-existent-id not found');
    });

    it('should throw error when retrying non-failed update', async () => {
      // Set update as pending
      const update = optimisticUIManager.getOptimisticUpdate('test-uuid-123');
      if (update) {
        update.status = 'PENDING';
      }

      await expect(
        optimisticUIManager.retryOptimisticUpdate('test-uuid-123')
      ).rejects.toThrow('Can only retry failed optimistic updates');
    });

    it('should throw error when max retries exceeded', async () => {
      // Set update with max retries
      const update = optimisticUIManager.getOptimisticUpdate('test-uuid-123');
      if (update) {
        update.retryCount = 3;
        update.maxRetries = 3;
      }

      await expect(
        optimisticUIManager.retryOptimisticUpdate('test-uuid-123')
      ).rejects.toThrow('Maximum retry attempts exceeded');
    });
  });

  describe('rollbackAllFailed', () => {
    beforeEach(async () => {
      // Create multiple failed updates
      for (let i = 0; i < 3; i++) {
        const updateId = `test-uuid-${i}`;
        (require('uuid').v4 as jest.Mock).mockReturnValueOnce(updateId);
        
        await optimisticUIManager.applyOptimisticUpdate(
          'ASSESSMENT',
          `entity-${i}`,
          'CREATE',
          { name: `Test Assessment ${i}` }
        );
        
        // Set as failed
        const update = optimisticUIManager.getOptimisticUpdate(updateId);
        if (update) {
          update.status = 'FAILED';
          update.error = `Sync failed ${i}`;
        }
      }
    });

    it('should rollback all failed updates', async () => {
      const rolledBackCount = await optimisticUIManager.rollbackAllFailed();

      expect(rolledBackCount).toBe(3);
      
      // Check that all updates are rolled back
      for (let i = 0; i < 3; i++) {
        const update = optimisticUIManager.getOptimisticUpdate(`test-uuid-${i}`);
        expect(update?.status).toBe('ROLLED_BACK');
      }
    });

    it('should continue rolling back even if some fail', async () => {
      // Mock one rollback to fail
      mockQueueService.removeQueueItem.mockRejectedValueOnce(new Error('Remove failed'));

      const rolledBackCount = await optimisticUIManager.rollbackAllFailed();

      // Should still attempt to rollback all, even if some fail
      expect(rolledBackCount).toBe(3);
    });
  });

  describe('getEntityState', () => {
    it('should return undefined for non-existent entity', () => {
      const entityState = optimisticUIManager.getEntityState('non-existent', 'ASSESSMENT');
      expect(entityState).toBeUndefined();
    });

    it('should return entity state after optimistic update', async () => {
      await optimisticUIManager.applyOptimisticUpdate(
        'ASSESSMENT',
        'entity-123',
        'CREATE',
        { name: 'Test Assessment' }
      );

      const entityState = optimisticUIManager.getEntityState('entity-123', 'ASSESSMENT');
      expect(entityState).toBeDefined();
      expect(entityState?.entityId).toBe('entity-123');
      expect(entityState?.entityType).toBe('ASSESSMENT');
      expect(entityState?.syncStatus).toBe('PENDING');
    });
  });

  describe('statistics and helpers', () => {
    beforeEach(async () => {
      // Create updates with different statuses
      const statuses: OptimisticUpdate['status'][] = ['PENDING', 'CONFIRMED', 'FAILED', 'ROLLED_BACK'];
      
      for (let i = 0; i < statuses.length; i++) {
        const updateId = `test-uuid-${i}`;
        (require('uuid').v4 as jest.Mock).mockReturnValueOnce(updateId);
        
        await optimisticUIManager.applyOptimisticUpdate(
          'ASSESSMENT',
          `entity-${i}`,
          'CREATE',
          { name: `Test Assessment ${i}` }
        );
        
        // Set specific status
        const update = optimisticUIManager.getOptimisticUpdate(updateId);
        if (update) {
          update.status = statuses[i];
        }
      }
    });

    it('should return correct optimistic stats', () => {
      const stats = optimisticUIManager.getOptimisticStats();
      
      expect(stats.totalUpdates).toBe(4);
      expect(stats.pendingUpdates).toBe(1);
      expect(stats.confirmedUpdates).toBe(1);
      expect(stats.failedUpdates).toBe(1);
      expect(stats.rolledBackUpdates).toBe(1);
    });

    it('should return pending updates correctly', () => {
      const pendingUpdates = optimisticUIManager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(1);
      expect(pendingUpdates[0].status).toBe('PENDING');
    });

    it('should return failed updates correctly', () => {
      const failedUpdates = optimisticUIManager.getFailedUpdates();
      expect(failedUpdates).toHaveLength(1);
      expect(failedUpdates[0].status).toBe('FAILED');
    });
  });

  describe('integration with sync engine', () => {
    let mockSyncEngine: any;

    beforeEach(() => {
      mockSyncEngine = {
        performSync: jest.fn(),
      };
      
      (require('@/lib/sync/SyncEngine') as any).syncEngine = mockSyncEngine;
    });

    it('should process optimistic update with sync engine', async () => {
      mockSyncEngine.performSync.mockResolvedValue({
        successful: [{ id: 'entity-123' }],
        conflicts: [],
        failed: [],
      });

      const updateId = await optimisticUIManager.applyOptimisticUpdate(
        'ASSESSMENT',
        'entity-123',
        'CREATE',
        { name: 'Test Assessment' }
      );

      // Wait for background processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const update = optimisticUIManager.getOptimisticUpdate(updateId);
      expect(update?.status).toBe('CONFIRMED');
      expect(mockSyncEngine.performSync).toHaveBeenCalled();
    });

    it('should handle sync conflicts', async () => {
      mockSyncEngine.performSync.mockResolvedValue({
        successful: [],
        conflicts: [{ id: 'conflict-1', entityId: 'entity-123' }],
        failed: [],
      });

      const updateId = await optimisticUIManager.applyOptimisticUpdate(
        'ASSESSMENT',
        'entity-123',
        'CREATE',
        { name: 'Test Assessment' }
      );

      // Wait for background processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const update = optimisticUIManager.getOptimisticUpdate(updateId);
      expect(update?.status).toBe('FAILED');
      expect(update?.error).toContain('conflict');
    });

    it('should handle sync failures', async () => {
      mockSyncEngine.performSync.mockResolvedValue({
        successful: [],
        conflicts: [],
        failed: [{ id: 'entity-123', error: 'Network error' }],
      });

      const updateId = await optimisticUIManager.applyOptimisticUpdate(
        'ASSESSMENT',
        'entity-123',
        'CREATE',
        { name: 'Test Assessment' }
      );

      // Wait for background processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const update = optimisticUIManager.getOptimisticUpdate(updateId);
      expect(update?.status).toBe('FAILED');
      expect(update?.error).toBe('Sync operation failed');
    });
  });
});