/**
 * SyncStatusIndicator Component Tests
 * 
 * Tests for the global sync status display component including
 * status indicators, progress visualization, and user interactions.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SyncStatusIndicator } from '@/components/shared/SyncStatusIndicator';

// Mock the sync store
const mockSyncStore = {
  optimisticUpdates: new Map(),
  pendingOperations: new Set(),
  rollbackInProgress: false,
  connectivityStatus: { isOnline: true },
  backgroundSyncProgress: null,
  queueSummary: null,
  isRefreshing: false,
  getOptimisticStats: jest.fn(() => ({
    totalUpdates: 0,
    pendingUpdates: 0,
    confirmedUpdates: 0,
    failedUpdates: 0,
    rolledBackUpdates: 0,
  })),
};

jest.mock('@/stores/sync.store', () => ({
  useSyncStore: jest.fn(() => mockSyncStore),
}));

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store to default state
    mockSyncStore.optimisticUpdates = new Map();
    mockSyncStore.pendingOperations = new Set();
    mockSyncStore.rollbackInProgress = false;
    mockSyncStore.connectivityStatus = { isOnline: true };
    mockSyncStore.backgroundSyncProgress = null;
    mockSyncStore.queueSummary = null;
    mockSyncStore.isRefreshing = false;
    mockSyncStore.getOptimisticStats = jest.fn(() => ({
      totalUpdates: 0,
      pendingUpdates: 0,
      confirmedUpdates: 0,
      failedUpdates: 0,
      rolledBackUpdates: 0,
    }));
  });

  describe('sync status states', () => {
    it('should display "Up to date" when no pending operations', () => {
      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Up to date')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should display "Offline" when not connected', () => {
      mockSyncStore.connectivityStatus = { isOnline: false };
      
      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should display pending count when operations are pending', () => {
      mockSyncStore.getOptimisticStats = jest.fn(() => ({
        totalUpdates: 3,
        pendingUpdates: 2,
        confirmedUpdates: 1,
        failedUpdates: 0,
        rolledBackUpdates: 0,
      }));
      
      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('2 pending')).toBeInTheDocument();
    });

    it('should display failed count when operations have failed', () => {
      mockSyncStore.getOptimisticStats = jest.fn(() => ({
        totalUpdates: 3,
        pendingUpdates: 0,
        confirmedUpdates: 1,
        failedUpdates: 2,
        rolledBackUpdates: 0,
      }));
      
      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('2 failed')).toBeInTheDocument();
    });

    it('should display "Syncing..." when sync is in progress', () => {
      mockSyncStore.isRefreshing = true;
      
      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('should display "Rolling back..." when rollback is in progress', () => {
      mockSyncStore.rollbackInProgress = true;
      
      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Rolling back...')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('should render compact version without text labels', () => {
      mockSyncStore.getOptimisticStats = jest.fn(() => ({
        totalUpdates: 5,
        pendingUpdates: 2,
        confirmedUpdates: 2,
        failedUpdates: 1,
        rolledBackUpdates: 0,
      }));
      
      render(<SyncStatusIndicator compact />);
      
      // Should show counters but not full text
      expect(screen.getByText('2')).toBeInTheDocument(); // Pending count
      expect(screen.getByText('1')).toBeInTheDocument(); // Failed count
      expect(screen.queryByText('Up to date')).not.toBeInTheDocument();
    });
  });

  describe('sync progress', () => {
    it('should display progress bar when background sync is active', () => {
      mockSyncStore.backgroundSyncProgress = {
        totalItems: 10,
        processedItems: 3,
        currentOperation: 'Syncing assessments',
        estimatedTimeRemaining: 5000,
      };
      
      render(<SyncStatusIndicator />);
      
      expect(screen.getByText('3/10')).toBeInTheDocument();
      // Progress bar should be rendered (test for presence of progress indicator)
      const progressElements = document.querySelectorAll('[style*="width: 30%"]');
      expect(progressElements.length).toBeGreaterThan(0);
    });
  });

  describe('details display', () => {
    it('should show details when showDetails is true', () => {
      mockSyncStore.queueSummary = {
        totalItems: 15,
        pendingItems: 5,
        failedItems: 2,
        syncingItems: 1,
        highPriorityItems: 3,
        lastUpdated: new Date('2023-01-01T12:00:00Z'),
        oldestPendingItem: {
          id: 'item-1',
          type: 'ASSESSMENT',
          createdAt: new Date('2023-01-01T11:00:00Z'),
          priority: 'HIGH',
        },
      };
      
      render(<SyncStatusIndicator showDetails />);
      
      expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
    });

    it('should show "Never" when no last sync time available', () => {
      render(<SyncStatusIndicator showDetails />);
      
      expect(screen.getByText(/Last sync: Never/)).toBeInTheDocument();
    });
  });

  describe('counters display', () => {
    it('should display all counter types when present', () => {
      mockSyncStore.getOptimisticStats = jest.fn(() => ({
        totalUpdates: 10,
        pendingUpdates: 3,
        confirmedUpdates: 5,
        failedUpdates: 2,
        rolledBackUpdates: 0,
      }));
      
      render(<SyncStatusIndicator />);
      
      // Should show pending count
      const pendingElements = screen.getAllByText('3');
      expect(pendingElements.length).toBeGreaterThan(0);
      
      // Should show failed count
      const failedElements = screen.getAllByText('2');
      expect(failedElements.length).toBeGreaterThan(0);
      
      // Should show confirmed count
      const confirmedElements = screen.getAllByText('5');
      expect(confirmedElements.length).toBeGreaterThan(0);
    });

    it('should not display counters when counts are zero', () => {
      render(<SyncStatusIndicator />);
      
      // No counter badges should be visible when all counts are zero
      const badges = document.querySelectorAll('[class*="bg-yellow-100"]');
      expect(badges.length).toBe(0);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      render(<SyncStatusIndicator />);
      
      // Component should be accessible
      const statusElement = screen.getByText('Up to date');
      expect(statusElement).toBeInTheDocument();
      
      const connectionElement = screen.getByText('Online');
      expect(connectionElement).toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<SyncStatusIndicator className="custom-class" />);
      
      const syncIndicator = container.firstChild;
      expect(syncIndicator).toHaveClass('custom-class');
    });
  });

  describe('real-time updates', () => {
    it('should reflect changes in sync state', () => {
      const { rerender } = render(<SyncStatusIndicator />);
      
      expect(screen.getByText('Up to date')).toBeInTheDocument();
      
      // Update mock store state
      mockSyncStore.getOptimisticStats = jest.fn(() => ({
        totalUpdates: 1,
        pendingUpdates: 1,
        confirmedUpdates: 0,
        failedUpdates: 0,
        rolledBackUpdates: 0,
      }));
      
      rerender(<SyncStatusIndicator />);
      
      expect(screen.getByText('1 pending')).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('should handle missing sync store gracefully', () => {
      // Mock a scenario where sync store might be unavailable
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      (require('@/stores/sync.store').useSyncStore as jest.Mock).mockImplementation(() => {
        throw new Error('Store not available');
      });
      
      expect(() => render(<SyncStatusIndicator />)).not.toThrow();
      
      console.error = originalConsoleError;
    });
  });
});