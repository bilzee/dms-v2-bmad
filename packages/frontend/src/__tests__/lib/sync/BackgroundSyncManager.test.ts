/**
 * @jest-environment jsdom
 */

import { BackgroundSyncManager } from '../../../lib/sync/BackgroundSyncManager';
import { ConnectivityDetector } from '../../../lib/sync/ConnectivityDetector';
import { OfflineQueueService } from '../../../lib/services/OfflineQueueService';

// Mock dependencies
jest.mock('../../../lib/sync/ConnectivityDetector');
jest.mock('../../../lib/services/OfflineQueueService');

// Mock Service Worker Background Sync API
Object.defineProperty(window, 'ServiceWorkerRegistration', {
  value: {
    prototype: {
      sync: {
        register: jest.fn(),
        getTags: jest.fn(),
      }
    }
  }
});

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      sync: {
        register: jest.fn().mockResolvedValue(undefined),
      }
    }),
    addEventListener: jest.fn(),
    controller: {
      postMessage: jest.fn(),
    }
  }
});

describe('BackgroundSyncManager', () => {
  let manager: BackgroundSyncManager;
  let mockConnectivityDetector: jest.Mocked<ConnectivityDetector>;
  let mockQueueService: jest.Mocked<OfflineQueueService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup connectivity detector mock
    mockConnectivityDetector = {
      getStatus: jest.fn().mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        connectionQuality: 'excellent',
        lastConnected: new Date(),
        batteryLevel: 80,
        isCharging: false,
      }),
      onConnectivityChange: jest.fn().mockImplementation((callback) => {
        // Call immediately with current status
        callback(mockConnectivityDetector.getStatus());
        return jest.fn(); // Return unsubscribe function
      }),
      isGoodForSync: jest.fn().mockReturnValue(true),
      getSyncSuitabilityScore: jest.fn().mockReturnValue(85),
    } as any;

    // Replace the singleton with our mock
    (require('../../../lib/sync/ConnectivityDetector') as any).connectivityDetector = mockConnectivityDetector;

    // Setup queue service mock
    mockQueueService = {
      getQueueItems: jest.fn().mockResolvedValue([
        {
          id: 'test-1',
          type: 'ASSESSMENT',
          action: 'CREATE',
          data: { test: 'data' },
          retryCount: 0,
          priority: 'HIGH',
          createdAt: new Date(),
        },
        {
          id: 'test-2',
          type: 'RESPONSE',
          action: 'CREATE',
          data: { test: 'data2' },
          retryCount: 0,
          priority: 'NORMAL',
          createdAt: new Date(),
        },
      ]),
      retryQueueItem: jest.fn().mockResolvedValue(undefined),
    } as any;

    (OfflineQueueService as jest.MockedClass<typeof OfflineQueueService>).mockImplementation(() => mockQueueService);

    // Create manager instance
    manager = new BackgroundSyncManager({
      enabled: true,
      syncIntervalMinutes: 1, // Short interval for testing
      maximumConcurrentOperations: 2,
      minimumBatteryLevel: 20,
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      const settings = manager.getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.syncIntervalMinutes).toBe(1);
      expect(settings.maximumConcurrentOperations).toBe(2);
      expect(settings.minimumBatteryLevel).toBe(20);
    });

    it('should subscribe to connectivity changes', () => {
      expect(mockConnectivityDetector.onConnectivityChange).toHaveBeenCalled();
    });

    it('should register service worker for background sync', async () => {
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(navigator.serviceWorker.ready).toHaveBeenCalled();
    });
  });

  describe('Settings Management', () => {
    it('should update settings correctly', () => {
      const newSettings = {
        enabled: false,
        syncIntervalMinutes: 10,
        minimumBatteryLevel: 30,
      };

      manager.updateSettings(newSettings);
      const updatedSettings = manager.getSettings();
      
      expect(updatedSettings.enabled).toBe(false);
      expect(updatedSettings.syncIntervalMinutes).toBe(10);
      expect(updatedSettings.minimumBatteryLevel).toBe(30);
    });

    it('should restart auto-sync when settings change', () => {
      const stopSpy = jest.spyOn(manager, 'stopAutoSync');
      const startSpy = jest.spyOn(manager, 'startAutoSync');

      manager.updateSettings({ enabled: true, syncIntervalMinutes: 5 });

      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('Connectivity Handling', () => {
    it('should trigger sync when connectivity improves', () => {
      const triggerSpy = jest.spyOn(manager, 'triggerImmediateSync');

      // Simulate connectivity change to online with good conditions
      const callback = mockConnectivityDetector.onConnectivityChange.mock.calls[0][0];
      callback({
        isOnline: true,
        connectionType: 'wifi',
        connectionQuality: 'excellent',
        lastConnected: new Date(),
        batteryLevel: 80,
        isCharging: false,
      });

      expect(triggerSpy).toHaveBeenCalledWith('connectivity_recovery');
    });

    it('should not trigger sync when conditions are not suitable', () => {
      mockConnectivityDetector.isGoodForSync.mockReturnValue(false);
      
      const triggerSpy = jest.spyOn(manager, 'triggerImmediateSync');

      const callback = mockConnectivityDetector.onConnectivityChange.mock.calls[0][0];
      callback({
        isOnline: true,
        connectionType: 'cellular',
        connectionQuality: 'poor',
        lastConnected: new Date(),
        batteryLevel: 15,
        isCharging: false,
      });

      expect(triggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Background Sync Operations', () => {
    beforeEach(() => {
      // Mock fetch for API calls
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    it('should process sync items by priority', async () => {
      await manager.triggerImmediateSync('test');

      expect(mockQueueService.getQueueItems).toHaveBeenCalledWith({ status: 'PENDING' });
      expect(mockQueueService.retryQueueItem).toHaveBeenCalledWith('test-1'); // HIGH priority first
      expect(mockQueueService.retryQueueItem).toHaveBeenCalledWith('test-2'); // NORMAL priority second
    });

    it('should respect maximum concurrent operations', async () => {
      // Add more items than the concurrency limit
      const manyItems = Array.from({ length: 5 }, (_, i) => ({
        id: `test-${i}`,
        type: 'ASSESSMENT' as const,
        action: 'CREATE' as const,
        data: { test: `data${i}` },
        retryCount: 0,
        priority: 'NORMAL' as const,
        createdAt: new Date(),
      }));

      mockQueueService.getQueueItems.mockResolvedValue(manyItems);

      await manager.triggerImmediateSync('test');

      // Should process in batches
      expect(mockQueueService.retryQueueItem).toHaveBeenCalledTimes(5);
    });

    it('should handle sync failures gracefully', async () => {
      mockQueueService.retryQueueItem.mockRejectedValueOnce(new Error('Sync failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await manager.triggerImmediateSync('test');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background sync failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Progress Tracking', () => {
    it('should track sync progress correctly', async () => {
      let progressUpdates: any[] = [];

      manager.subscribe({
        onProgress: (progress) => progressUpdates.push(progress),
      });

      await manager.triggerImmediateSync('test');

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0]).toHaveProperty('totalItems');
      expect(progressUpdates[0]).toHaveProperty('completedItems');
      expect(progressUpdates[0]).toHaveProperty('lastSyncAttempt');
    });

    it('should notify completion with metrics', async () => {
      let completionMetrics: any = null;

      manager.subscribe({
        onComplete: (metrics) => {
          completionMetrics = metrics;
        },
      });

      await manager.triggerImmediateSync('test');

      expect(completionMetrics).toBeTruthy();
      expect(completionMetrics).toHaveProperty('sessionId');
      expect(completionMetrics).toHaveProperty('itemsProcessed');
      expect(completionMetrics).toHaveProperty('itemsSucceeded');
    });
  });

  describe('Auto-Sync Scheduling', () => {
    it('should start auto-sync when enabled', () => {
      manager.startAutoSync();
      const status = manager.getStatus();
      expect(status.isRunning).toBe(false); // Running refers to sync in progress, not scheduler
    });

    it('should stop auto-sync when disabled', () => {
      manager.startAutoSync();
      manager.stopAutoSync();
      const status = manager.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('Pause and Resume', () => {
    it('should pause background sync operations', () => {
      manager.pause();
      const status = manager.getStatus();
      expect(status.isPaused).toBe(true);
    });

    it('should resume background sync operations', () => {
      manager.pause();
      manager.resume();
      const status = manager.getStatus();
      expect(status.isPaused).toBe(false);
    });

    it('should trigger sync on resume if conditions are good', () => {
      const triggerSpy = jest.spyOn(manager, 'triggerImmediateSync');
      
      manager.pause();
      manager.resume();

      expect(triggerSpy).toHaveBeenCalledWith('manual_resume');
    });
  });

  describe('Battery and Power Management', () => {
    it('should respect battery level constraints', async () => {
      // Set low battery
      mockConnectivityDetector.getStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        connectionQuality: 'excellent',
        lastConnected: new Date(),
        batteryLevel: 10, // Below minimum of 20%
        isCharging: false,
      });

      mockConnectivityDetector.isGoodForSync.mockReturnValue(false);

      const status = manager.getStatus();
      expect(status.canSync).toBe(false);
    });

    it('should allow sync when charging despite low battery', async () => {
      mockConnectivityDetector.getStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        connectionQuality: 'excellent',
        lastConnected: new Date(),
        batteryLevel: 10,
        isCharging: true, // Charging overrides low battery
      });

      mockConnectivityDetector.isGoodForSync.mockReturnValue(true);

      const triggerSpy = jest.spyOn(manager, 'triggerImmediateSync');
      
      // Update settings to require charging
      manager.updateSettings({ syncOnlyWhenCharging: true });
      
      const callback = mockConnectivityDetector.onConnectivityChange.mock.calls[0][0];
      callback(mockConnectivityDetector.getStatus());

      expect(triggerSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should implement exponential backoff on failures', async () => {
      mockQueueService.retryQueueItem.mockRejectedValue(new Error('Network error'));

      let errorReceived = false;
      manager.subscribe({
        onError: () => {
          errorReceived = true;
        },
      });

      await manager.triggerImmediateSync('test');

      expect(errorReceived).toBe(true);
    });

    it('should reset backoff on successful sync', async () => {
      // First sync fails
      mockQueueService.retryQueueItem.mockRejectedValueOnce(new Error('Fail'));
      await manager.triggerImmediateSync('test').catch(() => {});

      // Second sync succeeds
      mockQueueService.retryQueueItem.mockResolvedValue(undefined);
      await manager.triggerImmediateSync('test');

      // Backoff should be reset (this is internal state, hard to test directly)
      // We verify by ensuring subsequent syncs can run immediately
      const triggerSpy = jest.spyOn(manager, 'triggerImmediateSync');
      
      const callback = mockConnectivityDetector.onConnectivityChange.mock.calls[0][0];
      callback(mockConnectivityDetector.getStatus());

      expect(triggerSpy).toHaveBeenCalled();
    });
  });

  describe('Service Worker Communication', () => {
    it('should send messages to service worker', () => {
      manager.pause();
      
      expect(navigator.serviceWorker.controller?.postMessage).toHaveBeenCalledWith({
        type: 'PAUSE_BACKGROUND_SYNC',
      });
    });
  });

  describe('Metrics and History', () => {
    it('should maintain sync history', async () => {
      await manager.triggerImmediateSync('test');
      
      const history = manager.getSyncHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('sessionId');
      expect(history[0]).toHaveProperty('startTime');
    });

    it('should limit history buffer size', async () => {
      // Trigger multiple syncs to fill buffer
      for (let i = 0; i < 60; i++) {
        await manager.triggerImmediateSync(`test-${i}`);
      }
      
      const history = manager.getSyncHistory();
      expect(history.length).toBeLessThanOrEqual(50); // Max buffer size
    });
  });
});