/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncProgressIndicator } from '../../../components/shared/SyncProgressIndicator';
import { backgroundSyncManager } from '../../../lib/sync/BackgroundSyncManager';
import { connectivityDetector } from '../../../lib/sync/ConnectivityDetector';

// Mock dependencies
jest.mock('../../../lib/sync/BackgroundSyncManager');
jest.mock('../../../lib/sync/ConnectivityDetector');
jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

const mockBackgroundSyncManager = backgroundSyncManager as jest.Mocked<typeof backgroundSyncManager>;
const mockConnectivityDetector = connectivityDetector as jest.Mocked<typeof connectivityDetector>;

describe('SyncProgressIndicator', () => {
  const mockConnectivityStatus = {
    isOnline: true,
    connectionType: 'wifi' as const,
    connectionQuality: 'excellent' as const,
    lastConnected: new Date(),
    batteryLevel: 80,
    isCharging: false,
  };

  const mockSyncStatus = {
    isRunning: false,
    isPaused: false,
    isEnabled: true,
    canSync: true,
    nextScheduledSync: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
  };

  beforeEach(() => {
    // Setup mocks
    mockConnectivityDetector.onConnectivityChange.mockImplementation((callback) => {
      callback(mockConnectivityStatus);
      return jest.fn(); // Return unsubscribe function
    });

    mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
      // Don't trigger callbacks by default
      return jest.fn(); // Return unsubscribe function
    });

    mockBackgroundSyncManager.getStatus.mockReturnValue(mockSyncStatus);
    mockBackgroundSyncManager.triggerImmediateSync.mockResolvedValue();
    mockBackgroundSyncManager.pause.mockImplementation(() => {});
    mockBackgroundSyncManager.resume.mockImplementation(() => {});
  });

  describe('Minimal Variant', () => {
    it('should render minimal connectivity indicator when online', () => {
      render(<SyncProgressIndicator variant="minimal" />);
      
      // Should show connectivity icon (WiFi icon for excellent connection)
      expect(document.querySelector('[data-lucide="wifi"]')).toBeInTheDocument();
    });

    it('should show offline indicator when offline', () => {
      mockConnectivityDetector.onConnectivityChange.mockImplementation((callback) => {
        callback({
          ...mockConnectivityStatus,
          isOnline: false,
          connectionQuality: 'offline',
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="minimal" />);
      
      expect(document.querySelector('[data-lucide="wifi-off"]')).toBeInTheDocument();
    });

    it('should show progress badge when sync is active', () => {
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        // Simulate active progress
        callbacks.onProgress?.({
          totalItems: 5,
          completedItems: 2,
          failedItems: 0,
          lastSyncAttempt: new Date(),
          nextScheduledSync: new Date(),
          averageSyncDuration: 30,
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="minimal" />);
      
      expect(screen.getByText('2/5')).toBeInTheDocument();
    });
  });

  describe('Compact Variant', () => {
    it('should render compact sync interface', () => {
      render(<SyncProgressIndicator variant="compact" />);
      
      expect(screen.getByText('Background Sync')).toBeInTheDocument();
    });

    it('should show progress bar during sync', () => {
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        callbacks.onProgress?.({
          totalItems: 10,
          completedItems: 3,
          failedItems: 1,
          lastSyncAttempt: new Date(),
          nextScheduledSync: new Date(),
          averageSyncDuration: 45,
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      expect(screen.getByText('3 of 10 items')).toBeInTheDocument();
      // Progress bar should show 30% (3/10)
      expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });

    it('should show estimated time remaining', () => {
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        callbacks.onProgress?.({
          totalItems: 5,
          completedItems: 1,
          failedItems: 0,
          currentOperation: {
            type: 'ASSESSMENT',
            entityId: 'test-123',
            progress: 50,
            estimatedTimeRemaining: 120, // 2 minutes
          },
          lastSyncAttempt: new Date(),
          nextScheduledSync: new Date(),
          averageSyncDuration: 30,
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="compact" showEstimatedTime={true} />);
      
      expect(screen.getByText('2m 0s')).toBeInTheDocument();
    });

    it('should show current operation details', () => {
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        callbacks.onProgress?.({
          totalItems: 3,
          completedItems: 1,
          failedItems: 0,
          currentOperation: {
            type: 'RESPONSE',
            entityId: 'response-456',
            progress: 75,
            estimatedTimeRemaining: 30,
          },
          lastSyncAttempt: new Date(),
          nextScheduledSync: new Date(),
          averageSyncDuration: 20,
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      expect(screen.getByText('Syncing response...')).toBeInTheDocument();
    });

    it('should show failed items count', () => {
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        callbacks.onProgress?.({
          totalItems: 8,
          completedItems: 5,
          failedItems: 2,
          lastSyncAttempt: new Date(),
          nextScheduledSync: new Date(),
          averageSyncDuration: 30,
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      expect(screen.getByText('2 items failed')).toBeInTheDocument();
    });
  });

  describe('Detailed Variant', () => {
    it('should render detailed sync information', () => {
      render(<SyncProgressIndicator variant="detailed" />);
      
      expect(screen.getByText('Background Sync')).toBeInTheDocument();
    });

    it('should show connectivity status when enabled', () => {
      render(
        <SyncProgressIndicator 
          variant="detailed" 
          showConnectivityStatus={true} 
        />
      );
      
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('(wifi)')).toBeInTheDocument();
      expect(screen.getByText('excellent')).toBeInTheDocument();
    });

    it('should show battery status when enabled', () => {
      render(
        <SyncProgressIndicator 
          variant="detailed" 
          showBatteryStatus={true} 
        />
      );
      
      expect(screen.getByText('Battery')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should show charging indicator', () => {
      mockConnectivityDetector.onConnectivityChange.mockImplementation((callback) => {
        callback({
          ...mockConnectivityStatus,
          isCharging: true,
        });
        return jest.fn();
      });

      render(
        <SyncProgressIndicator 
          variant="detailed" 
          showBatteryStatus={true} 
        />
      );
      
      expect(screen.getByText('80% ⚡')).toBeInTheDocument();
    });

    it('should show sync status and next scheduled time', () => {
      render(<SyncProgressIndicator variant="detailed" />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Next sync')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should trigger manual sync when sync button is clicked', async () => {
      render(<SyncProgressIndicator variant="compact" />);
      
      const syncButton = screen.getByRole('button', { name: /sync now/i });
      fireEvent.click(syncButton);
      
      await waitFor(() => {
        expect(mockBackgroundSyncManager.triggerImmediateSync).toHaveBeenCalledWith('manual_trigger');
      });
    });

    it('should pause sync when pause button is clicked', () => {
      render(<SyncProgressIndicator variant="compact" />);
      
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);
      
      expect(mockBackgroundSyncManager.pause).toHaveBeenCalled();
    });

    it('should resume sync when resume button is clicked', () => {
      mockBackgroundSyncManager.getStatus.mockReturnValue({
        ...mockSyncStatus,
        isPaused: true,
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      const resumeButton = screen.getByRole('button', { name: /resume/i });
      fireEvent.click(resumeButton);
      
      expect(mockBackgroundSyncManager.resume).toHaveBeenCalled();
    });

    it('should hide indicator when close button is clicked', () => {
      render(<SyncProgressIndicator variant="compact" />);
      
      const closeButton = screen.getByRole('button', { name: '' }); // Close button with X icon
      fireEvent.click(closeButton);
      
      // Component should not be visible
      expect(screen.queryByText('Background Sync')).not.toBeInTheDocument();
    });

    it('should disable sync button when conditions are not suitable', () => {
      mockBackgroundSyncManager.getStatus.mockReturnValue({
        ...mockSyncStatus,
        canSync: false,
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      const syncButton = screen.getByRole('button', { name: /sync now/i });
      expect(syncButton).toBeDisabled();
    });

    it('should disable sync button when sync is already running', () => {
      mockBackgroundSyncManager.getStatus.mockReturnValue({
        ...mockSyncStatus,
        isRunning: true,
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      const syncButton = screen.getByRole('button', { name: /sync now/i });
      expect(syncButton).toBeDisabled();
    });
  });

  describe('Auto-hide Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should auto-hide after completion when enabled', () => {
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        // Simulate sync completion
        setTimeout(() => {
          callbacks.onComplete?.({
            sessionId: 'test-session',
            startTime: new Date(),
            endTime: new Date(),
            itemsProcessed: 5,
            itemsSucceeded: 5,
            itemsFailed: 0,
            totalDataSynced: 1024,
            networkUsage: 2048,
            batteryUsed: 2,
            errors: [],
          });
        }, 100);
        return jest.fn();
      });

      render(
        <SyncProgressIndicator 
          variant="compact" 
          autoHide={true} 
          autoHideDelay={2} 
        />
      );

      // Fast-forward to trigger completion
      jest.advanceTimersByTime(100);
      
      // Should still be visible immediately after completion
      expect(screen.getByText('Background Sync')).toBeInTheDocument();
      
      // Fast-forward past auto-hide delay
      jest.advanceTimersByTime(2000);
      
      // Should be hidden now
      expect(screen.queryByText('Background Sync')).not.toBeInTheDocument();
    });

    it('should not auto-hide when disabled', () => {
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        setTimeout(() => {
          callbacks.onComplete?.({
            sessionId: 'test-session',
            startTime: new Date(),
            endTime: new Date(),
            itemsProcessed: 3,
            itemsSucceeded: 3,
            itemsFailed: 0,
            totalDataSynced: 512,
            networkUsage: 1024,
            batteryUsed: 1,
            errors: [],
          });
        }, 100);
        return jest.fn();
      });

      render(
        <SyncProgressIndicator 
          variant="compact" 
          autoHide={false} 
        />
      );

      jest.advanceTimersByTime(100);
      jest.advanceTimersByTime(10000); // Wait much longer
      
      // Should still be visible
      expect(screen.getByText('Background Sync')).toBeInTheDocument();
    });
  });

  describe('Toast Notifications', () => {
    it('should show toast notification when sync starts', () => {
      const { toast } = require('sonner');
      
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        callbacks.onProgress?.({
          totalItems: 3,
          completedItems: 0,
          failedItems: 0,
          lastSyncAttempt: new Date(),
          nextScheduledSync: new Date(),
          averageSyncDuration: 30,
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      expect(toast.info).toHaveBeenCalledWith(
        'Syncing 3 items in background',
        expect.objectContaining({ duration: 3000 })
      );
    });

    it('should show success toast on successful completion', () => {
      const { toast } = require('sonner');
      
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        callbacks.onComplete?.({
          sessionId: 'test',
          startTime: new Date(),
          endTime: new Date(),
          itemsProcessed: 4,
          itemsSucceeded: 4,
          itemsFailed: 0,
          totalDataSynced: 2048,
          networkUsage: 4096,
          batteryUsed: 3,
          errors: [],
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      expect(toast.success).toHaveBeenCalledWith(
        'Successfully synced 4 items',
        expect.objectContaining({ duration: 2000 })
      );
    });

    it('should show warning toast when some items fail', () => {
      const { toast } = require('sonner');
      
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        callbacks.onComplete?.({
          sessionId: 'test',
          startTime: new Date(),
          endTime: new Date(),
          itemsProcessed: 5,
          itemsSucceeded: 3,
          itemsFailed: 2,
          totalDataSynced: 1536,
          networkUsage: 3072,
          batteryUsed: 4,
          errors: ['Item 1 failed', 'Item 2 failed'],
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      expect(toast.warning).toHaveBeenCalledWith(
        'Synced 3 items, 2 failed',
        expect.objectContaining({ duration: 4000 })
      );
    });

    it('should show error toast on sync failure', () => {
      const { toast } = require('sonner');
      
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        callbacks.onError?.('Network connection failed');
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      expect(toast.error).toHaveBeenCalledWith(
        'Background sync failed: Network connection failed',
        expect.objectContaining({ duration: 5000 })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      render(<SyncProgressIndicator variant="detailed" />);
      
      const syncButton = screen.getByRole('button', { name: /sync now/i });
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      
      expect(syncButton).toBeInTheDocument();
      expect(pauseButton).toBeInTheDocument();
    });

    it('should have proper role for progress bar', () => {
      mockBackgroundSyncManager.subscribe.mockImplementation((callbacks) => {
        callbacks.onProgress?.({
          totalItems: 4,
          completedItems: 2,
          failedItems: 0,
          lastSyncAttempt: new Date(),
          nextScheduledSync: new Date(),
          averageSyncDuration: 25,
        });
        return jest.fn();
      });

      render(<SyncProgressIndicator variant="compact" />);
      
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });
  });
});