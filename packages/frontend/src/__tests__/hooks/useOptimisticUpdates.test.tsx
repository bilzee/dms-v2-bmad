/**
 * useOptimisticUpdates Hook Tests
 * 
 * Tests for the React hook that provides optimistic UI update functionality
 * including immediate feedback, error handling, and rollback capabilities.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates';

// Mock dependencies
const mockOptimisticUIManager = {
  applyOptimisticUpdate: jest.fn() as jest.MockedFunction<(entityType: string, entityId: string, updates: any, operation?: string) => Promise<string>>,
  retryOptimisticUpdate: jest.fn() as jest.MockedFunction<(updateId: string) => Promise<void>>,
  rollbackOptimisticUpdate: jest.fn() as jest.MockedFunction<(updateId: string) => Promise<void>>,
  rollbackAllFailed: jest.fn() as jest.MockedFunction<() => Promise<number>>,
  getOptimisticUpdate: jest.fn() as jest.MockedFunction<(updateId: string) => any>,
  getEntityState: jest.fn() as jest.MockedFunction<(entityType: string, entityId: string) => any>,
  getOptimisticStats: jest.fn() as jest.MockedFunction<() => any>,
};

const mockSyncStore = {
  optimisticUpdates: new Map(),
  pendingOperations: new Set(),
  rollbackInProgress: false,
  retryOptimisticUpdate: jest.fn() as jest.MockedFunction<(updateId: string) => Promise<void>>,
  rollbackOptimisticUpdate: jest.fn() as jest.MockedFunction<(updateId: string) => Promise<void>>,
  rollbackAllFailed: jest.fn() as jest.MockedFunction<() => Promise<number>>,
  getOptimisticEntityState: jest.fn() as jest.MockedFunction<(entityType: string, entityId: string) => any>,
  getOptimisticStats: jest.fn(() => ({
    totalUpdates: 0,
    pendingUpdates: 0,
    confirmedUpdates: 0,
    failedUpdates: 0,
    rolledBackUpdates: 0,
  })) as jest.MockedFunction<() => any>,
};

jest.mock('@/lib/sync/optimistic', () => ({
  optimisticUIManager: mockOptimisticUIManager,
}));

jest.mock('@/stores/sync.store', () => ({
  useSyncStore: jest.fn(() => mockSyncStore),
}));

describe('useOptimisticUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock state
    mockSyncStore.optimisticUpdates = new Map();
    mockSyncStore.pendingOperations = new Set();
    mockSyncStore.rollbackInProgress = false;
    mockSyncStore.getOptimisticStats = jest.fn(() => ({
      totalUpdates: 0,
      pendingUpdates: 0,
      confirmedUpdates: 0,
      failedUpdates: 0,
      rolledBackUpdates: 0,
    }));
    
    mockOptimisticUIManager.applyOptimisticUpdate.mockResolvedValue('update-123');
    mockOptimisticUIManager.getOptimisticStats.mockReturnValue({
      totalUpdates: 0,
      pendingUpdates: 0,
      confirmedUpdates: 0,
      failedUpdates: 0,
      rolledBackUpdates: 0,
    });
  });

  describe('basic functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.isRollingBack).toBe(false);
      expect(result.current.pendingUpdates).toEqual([]);
      expect(result.current.stats.totalUpdates).toBe(0);
    });

    it('should return correct state when entity has pending operations', () => {
      mockSyncStore.pendingOperations = new Set(['entity-123']);
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
          entityId: 'entity-123',
        })
      );

      expect(result.current.isPending).toBe(true);
    });

    it('should return correct entity state', () => {
      const mockEntityState = {
        entityId: 'entity-123',
        entityType: 'ASSESSMENT',
        syncStatus: 'PENDING' as const,
        lastUpdate: new Date(),
        retryCount: 0,
        canRetry: true,
        canRollback: true,
      };
      
      mockSyncStore.getOptimisticEntityState.mockReturnValue(mockEntityState);
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
          entityId: 'entity-123',
        })
      );

      expect(result.current.entityState).toEqual(mockEntityState);
    });
  });

  describe('applyOptimisticUpdate', () => {
    it('should call OptimisticUIManager with correct parameters', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      await act(async () => {
        const updateId = await result.current.applyOptimisticUpdate(
          'entity-123',
          'CREATE',
          { name: 'Test Assessment' },
          null
        );
        
        expect(updateId).toBe('update-123');
      });

      expect(mockOptimisticUIManager.applyOptimisticUpdate).toHaveBeenCalledWith(
        'ASSESSMENT',
        'entity-123',
        'CREATE',
        { name: 'Test Assessment' },
        null
      );
    });

    it('should handle errors from OptimisticUIManager', async () => {
      mockOptimisticUIManager.applyOptimisticUpdate.mockRejectedValue(new Error('Update failed'));
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      await act(async () => {
        await expect(
          result.current.applyOptimisticUpdate(
            'entity-123',
            'CREATE',
            { name: 'Test Assessment' }
          )
        ).rejects.toThrow('Update failed');
      });
    });
  });

  describe('retry functionality', () => {
    it('should retry optimistic update', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      await act(async () => {
        await result.current.retryUpdate('update-123');
      });

      expect(mockSyncStore.retryOptimisticUpdate).toHaveBeenCalledWith('update-123');
    });

    it('should handle retry errors', async () => {
      mockSyncStore.retryOptimisticUpdate.mockRejectedValue(new Error('Retry failed'));
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      await act(async () => {
        await expect(result.current.retryUpdate('update-123')).rejects.toThrow('Retry failed');
      });
    });
  });

  describe('rollback functionality', () => {
    it('should rollback optimistic update', async () => {
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      await act(async () => {
        await result.current.rollbackUpdate('update-123');
      });

      expect(mockSyncStore.rollbackOptimisticUpdate).toHaveBeenCalledWith('update-123');
    });

    it('should rollback all failed updates', async () => {
      mockSyncStore.rollbackAllFailed.mockResolvedValue(3);
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      let rolledBackCount: number;
      await act(async () => {
        rolledBackCount = await result.current.rollbackAllFailed();
      });

      expect(rolledBackCount!).toBe(3);
      expect(mockSyncStore.rollbackAllFailed).toHaveBeenCalled();
    });
  });

  describe('callback handling', () => {
    it('should call onSuccess callback when update succeeds', async () => {
      const onSuccess = jest.fn();
      const mockUpdate = {
        id: 'update-123',
        entityType: 'ASSESSMENT',
        entityId: 'entity-123',
        status: 'CONFIRMED' as const,
      };
      
      mockSyncStore.optimisticUpdates.set('update-123', mockUpdate as any);
      
      const { rerender } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
          onSuccess,
        })
      );

      // Trigger re-render to simulate status change
      rerender();

      expect(onSuccess).toHaveBeenCalledWith('update-123');
    });

    it('should call onError callback when update fails', async () => {
      const onError = jest.fn();
      const mockUpdate = {
        id: 'update-123',
        entityType: 'ASSESSMENT',
        entityId: 'entity-123',
        status: 'FAILED' as const,
        error: 'Sync failed',
      };
      
      mockSyncStore.optimisticUpdates.set('update-123', mockUpdate as any);
      
      const { rerender } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
          onError,
        })
      );

      // Trigger re-render to simulate status change
      rerender();

      expect(onError).toHaveBeenCalledWith('update-123', 'Sync failed');
    });

    it('should call onRollback callback when update is rolled back', async () => {
      const onRollback = jest.fn();
      const mockUpdate = {
        id: 'update-123',
        entityType: 'ASSESSMENT',
        entityId: 'entity-123',
        status: 'ROLLED_BACK' as const,
      };
      
      mockSyncStore.optimisticUpdates.set('update-123', mockUpdate as any);
      
      const { rerender } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
          onRollback,
        })
      );

      // Trigger re-render to simulate status change
      rerender();

      expect(onRollback).toHaveBeenCalledWith('update-123');
    });
  });

  describe('auto-retry functionality', () => {
    it('should auto-retry failed updates when enabled', async () => {
      jest.useFakeTimers();
      
      const mockUpdate = {
        id: 'update-123',
        entityType: 'ASSESSMENT',
        entityId: 'entity-123',
        status: 'FAILED' as const,
        error: 'Network error',
        retryCount: 0,
      };
      
      mockSyncStore.optimisticUpdates.set('update-123', mockUpdate as any);
      
      const { result, rerender } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
          autoRetry: true,
          maxRetries: 3,
        })
      );

      // Trigger re-render to simulate status change
      rerender();

      // Fast-forward time to trigger auto-retry
      act(() => {
        jest.advanceTimersByTime(1000); // First retry after 1 second
      });

      await act(async () => {
        // Wait for retry to complete
      });

      expect(mockSyncStore.retryOptimisticUpdate).toHaveBeenCalledWith('update-123');
      
      jest.useRealTimers();
    });

    it('should respect max retries limit', async () => {
      const mockUpdate = {
        id: 'update-123',
        entityType: 'ASSESSMENT',
        entityId: 'entity-123',
        status: 'FAILED' as const,
        error: 'Network error',
        retryCount: 3, // Already at max retries
      };
      
      mockSyncStore.optimisticUpdates.set('update-123', mockUpdate as any);
      
      const { rerender } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
          autoRetry: true,
          maxRetries: 3,
        })
      );

      // Trigger re-render to simulate status change
      rerender();

      // Should not attempt retry when max retries exceeded
      expect(mockSyncStore.retryOptimisticUpdate).not.toHaveBeenCalled();
    });
  });

  describe('helper functions', () => {
    it('should return correct update status', () => {
      const mockUpdate = {
        id: 'update-123',
        status: 'PENDING' as const,
      };
      
      mockSyncStore.optimisticUpdates.set('update-123', mockUpdate as any);
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      const status = result.current.getUpdateStatus('update-123');
      expect(status).toBe('PENDING');
    });

    it('should detect active updates correctly', () => {
      const mockUpdate = {
        id: 'update-123',
        entityType: 'ASSESSMENT',
        status: 'PENDING' as const,
      };
      
      mockSyncStore.optimisticUpdates.set('update-123', mockUpdate as any);
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      expect(result.current.hasActiveUpdates()).toBe(true);
    });

    it('should return failed updates correctly', () => {
      const mockUpdate = {
        id: 'update-123',
        entityType: 'ASSESSMENT',
        status: 'FAILED' as const,
      };
      
      mockSyncStore.optimisticUpdates.set('update-123', mockUpdate as any);
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      const failedUpdates = result.current.getFailedUpdates();
      expect(failedUpdates).toHaveLength(1);
      expect(failedUpdates[0].status).toBe('FAILED');
    });
  });

  describe('filtering by entity', () => {
    it('should filter updates by entity type', () => {
      const assessmentUpdate = {
        id: 'update-1',
        entityType: 'ASSESSMENT' as const,
        status: 'PENDING' as const,
      };
      
      const responseUpdate = {
        id: 'update-2',
        entityType: 'RESPONSE' as const,
        status: 'PENDING' as const,
      };
      
      mockSyncStore.optimisticUpdates.set('update-1', assessmentUpdate as any);
      mockSyncStore.optimisticUpdates.set('update-2', responseUpdate as any);
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
        })
      );

      const failedUpdates = result.current.getFailedUpdates();
      // Should not include RESPONSE updates
      expect(failedUpdates).toHaveLength(0);
    });

    it('should filter updates by entity ID when provided', () => {
      const update1 = {
        id: 'update-1',
        entityType: 'ASSESSMENT' as const,
        entityId: 'entity-1',
        status: 'FAILED' as const,
      };
      
      const update2 = {
        id: 'update-2',
        entityType: 'ASSESSMENT' as const,
        entityId: 'entity-2',
        status: 'FAILED' as const,
      };
      
      mockSyncStore.optimisticUpdates.set('update-1', update1 as any);
      mockSyncStore.optimisticUpdates.set('update-2', update2 as any);
      
      const { result } = renderHook(() =>
        useOptimisticUpdates({
          entityType: 'ASSESSMENT',
          entityId: 'entity-1',
        })
      );

      const failedUpdates = result.current.getFailedUpdates();
      expect(failedUpdates).toHaveLength(1);
      expect(failedUpdates[0].entityId).toBe('entity-1');
    });
  });
});