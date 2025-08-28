/**
 * @jest-environment jsdom
 */

import { ConnectivityDetector, ConnectivityStatus } from '../../../lib/sync/ConnectivityDetector';

describe('ConnectivityDetector', () => {
  let detector: ConnectivityDetector;
  let mockConnection: any;
  let mockBattery: any;

  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    // Mock connection API
    mockConnection = {
      type: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      addEventListener: jest.fn(),
    };

    Object.defineProperty(navigator, 'connection', {
      value: mockConnection,
      writable: true,
    });

    // Mock battery API
    mockBattery = {
      level: 0.8,
      charging: false,
      addEventListener: jest.fn(),
    };

    Object.defineProperty(navigator, 'getBattery', {
      value: () => Promise.resolve(mockBattery),
      writable: true,
    });

    // Mock window.addEventListener
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();

    detector = new ConnectivityDetector();
  });

  afterEach(() => {
    detector.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with online status', () => {
      const status = detector.getStatus();
      expect(status.isOnline).toBe(true);
    });

    it('should setup event listeners for online/offline events', () => {
      expect(global.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should setup connection change listener when supported', () => {
      expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle missing APIs gracefully', () => {
      // Remove API support
      Object.defineProperty(navigator, 'connection', { value: undefined });
      Object.defineProperty(navigator, 'getBattery', { value: undefined });

      const detectorWithoutAPIs = new ConnectivityDetector();
      const status = detectorWithoutAPIs.getStatus();

      expect(status.connectionType).toBe('unknown');
      expect(status.batteryLevel).toBeUndefined();

      detectorWithoutAPIs.destroy();
    });
  });

  describe('Connection Type Detection', () => {
    it('should detect WiFi connection', async () => {
      mockConnection.type = 'wifi';
      
      // Trigger status update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.connectionType).toBe('wifi');
    });

    it('should detect cellular connection', async () => {
      mockConnection.type = 'cellular';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.connectionType).toBe('cellular');
    });

    it('should detect ethernet connection', async () => {
      mockConnection.type = 'ethernet';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.connectionType).toBe('ethernet');
    });

    it('should default to unknown for unsupported types', async () => {
      mockConnection.type = 'bluetooth';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.connectionType).toBe('unknown');
    });
  });

  describe('Connection Quality Assessment', () => {
    it('should assess excellent quality for 4G', async () => {
      mockConnection.effectiveType = '4g';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.connectionQuality).toBe('excellent');
    });

    it('should assess good quality for 3G', async () => {
      mockConnection.effectiveType = '3g';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.connectionQuality).toBe('good');
    });

    it('should assess poor quality for 2G', async () => {
      mockConnection.effectiveType = '2g';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.connectionQuality).toBe('poor');
    });

    it('should use downlink speed as fallback', async () => {
      mockConnection.effectiveType = undefined;
      mockConnection.downlink = 15;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.connectionQuality).toBe('excellent');
    });

    it('should assess poor quality for low downlink', async () => {
      mockConnection.effectiveType = undefined;
      mockConnection.downlink = 1;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.connectionQuality).toBe('poor');
    });
  });

  describe('Battery Monitoring', () => {
    it('should report battery level as percentage', async () => {
      mockBattery.level = 0.75;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.batteryLevel).toBe(75);
    });

    it('should report charging status', async () => {
      mockBattery.charging = true;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = detector.getStatus();
      expect(status.isCharging).toBe(true);
    });

    it('should setup battery event listeners', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockBattery.addEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
      expect(mockBattery.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
    });
  });

  describe('Connectivity Change Events', () => {
    it('should notify subscribers of connectivity changes', (done) => {
      let callCount = 0;
      
      detector.onConnectivityChange((status) => {
        callCount++;
        
        if (callCount === 1) {
          // Initial call
          expect(status.isOnline).toBe(true);
        } else if (callCount === 2) {
          // After change
          expect(status.isOnline).toBe(false);
          done();
        }
      });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // Find and call the offline event handler
      const offlineHandler = (global.addEventListener as jest.Mock).mock.calls
        .find(([event]) => event === 'offline')?.[1];
      
      if (offlineHandler) {
        offlineHandler();
      }
    });

    it('should update last connected time when going online', (done) => {
      const initialTime = new Date('2023-01-01T00:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(initialTime);

      detector.onConnectivityChange((status) => {
        if (!status.isOnline) {
          // Now go online
          const newTime = new Date('2023-01-01T00:05:00Z');
          jest.setSystemTime(newTime);
          
          Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
          
          const onlineHandler = (global.addEventListener as jest.Mock).mock.calls
            .find(([event]) => event === 'online')?.[1];
          
          if (onlineHandler) {
            onlineHandler();
          }
        } else if (status.lastConnected.getTime() === new Date('2023-01-01T00:05:00Z').getTime()) {
          expect(status.lastConnected).toEqual(new Date('2023-01-01T00:05:00Z'));
          jest.useRealTimers();
          done();
        }
      });

      // First go offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      const offlineHandler = (global.addEventListener as jest.Mock).mock.calls
        .find(([event]) => event === 'offline')?.[1];
      
      if (offlineHandler) {
        offlineHandler();
      }
    });

    it('should provide unsubscribe function', () => {
      const unsubscribe = detector.onConnectivityChange(() => {});
      expect(typeof unsubscribe).toBe('function');
      
      // Should not throw when called
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Sync Suitability Assessment', () => {
    it('should return false when offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // Create a new detector to pick up the offline status
      const offlineDetector = new ConnectivityDetector();
      expect(offlineDetector.isGoodForSync()).toBe(false);
      offlineDetector.destroy();
    });

    it('should return false for poor connection quality', async () => {
      mockConnection.effectiveType = '2g';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(detector.isGoodForSync()).toBe(false);
    });

    it('should return false for low battery when not charging', async () => {
      mockBattery.level = 0.1; // 10%
      mockBattery.charging = false;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(detector.isGoodForSync()).toBe(false);
    });

    it('should return true for good conditions', async () => {
      mockConnection.effectiveType = '4g';
      mockBattery.level = 0.8;
      mockBattery.charging = false;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(detector.isGoodForSync()).toBe(true);
    });
  });

  describe('Sync Suitability Scoring', () => {
    it('should return 0 score when offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const offlineDetector = new ConnectivityDetector();
      expect(offlineDetector.getSyncSuitabilityScore()).toBe(0);
      offlineDetector.destroy();
    });

    it('should give high score for excellent conditions', async () => {
      mockConnection.type = 'wifi';
      mockConnection.effectiveType = '4g';
      mockBattery.level = 0.9;
      mockBattery.charging = true;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const score = detector.getSyncSuitabilityScore();
      expect(score).toBeGreaterThan(90);
    });

    it('should give low score for poor conditions', async () => {
      mockConnection.type = 'unknown';
      mockConnection.effectiveType = '2g';
      mockBattery.level = 0.15;
      mockBattery.charging = false;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const score = detector.getSyncSuitabilityScore();
      expect(score).toBeLessThan(50);
    });

    it('should cap score at 100', async () => {
      // Set extremely good conditions
      mockConnection.type = 'wifi';
      mockConnection.effectiveType = '4g';
      mockBattery.level = 1;
      mockBattery.charging = true;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const score = detector.getSyncSuitabilityScore();
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Time Since Last Connected', () => {
    it('should return 0 when online', () => {
      const timeSince = detector.getTimeSinceLastConnected();
      expect(timeSince).toBe(0);
    });

    it('should return time difference when offline', (done) => {
      jest.useFakeTimers();
      const startTime = new Date('2023-01-01T00:00:00Z');
      jest.setSystemTime(startTime);

      detector.onConnectivityChange((status) => {
        if (!status.isOnline) {
          // Advance time
          const laterTime = new Date('2023-01-01T00:30:00Z');
          jest.setSystemTime(laterTime);
          
          const timeSince = detector.getTimeSinceLastConnected();
          expect(timeSince).toBe(30 * 60 * 1000); // 30 minutes in ms
          
          jest.useRealTimers();
          done();
        }
      });

      // Go offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      const offlineHandler = (global.addEventListener as jest.Mock).mock.calls
        .find(([event]) => event === 'offline')?.[1];
      
      if (offlineHandler) {
        offlineHandler();
      }
    });
  });

  describe('Connectivity Testing', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should perform connectivity test with good response time', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await detector.performConnectivityTest();
      
      expect(result.success).toBe(true);
      expect(typeof result.responseTime).toBe('number');
      expect(typeof result.estimatedSpeed).toBe('number');
    });

    it('should handle failed connectivity test', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await detector.performConnectivityTest();
      
      expect(result.success).toBe(false);
      expect(typeof result.responseTime).toBe('number');
    });

    it('should estimate speed based on response time', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({}),
            });
          }, 50); // 50ms response time - should indicate excellent speed
        });
      });

      const result = await detector.performConnectivityTest();
      
      expect(result.success).toBe(true);
      expect(result.estimatedSpeed).toBe(20); // Excellent speed
    });
  });

  describe('Status Change Detection', () => {
    it('should only notify on meaningful status changes', (done) => {
      let notificationCount = 0;
      
      detector.onConnectivityChange(() => {
        notificationCount++;
      });

      // Initial notification should have been sent
      expect(notificationCount).toBe(1);

      // Trigger an update that doesn't change meaningful values
      const changeHandler = mockConnection.addEventListener.mock.calls
        .find(([event]) => event === 'change')?.[1];
      
      if (changeHandler) {
        // Call multiple times with same values
        changeHandler();
        changeHandler();
        changeHandler();
        
        setTimeout(() => {
          // Should not have triggered additional notifications for no-change
          expect(notificationCount).toBe(1);
          done();
        }, 100);
      } else {
        done();
      }
    });
  });
});