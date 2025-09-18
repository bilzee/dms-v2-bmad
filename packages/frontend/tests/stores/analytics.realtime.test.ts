import { useAnalyticsStore } from '@/stores/analytics.store';

// Mock EventSource
global.EventSource = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  readyState: 1,
  url: '',
})) as unknown as typeof EventSource;

// Mock fetch
global.fetch = jest.fn();

describe('Analytics Store - Real-time Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Reset store to initial state
    useAnalyticsStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Real-time Connection Management', () => {
    it('should start real-time connection with correct initial state', () => {
      const store = useAnalyticsStore.getState();
      
      store.startRealtimeConnection();
      
      expect(store.realtime.connectionStatus).toBe('connecting');
      expect(store.realtime.retryCount).toBe(0);
      expect(EventSource).toHaveBeenCalledWith('/api/v1/monitoring/analytics/realtime');
    });

    it('should update state when connection opens', () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        readyState: 1,
        url: '',
      };

      (EventSource as jest.MockedClass<typeof EventSource>).mockImplementation(() => mockEventSource as any);
      
      const store = useAnalyticsStore.getState();
      store.startRealtimeConnection();

      // Simulate connection opening
      if (mockEventSource.onopen) {
        mockEventSource.onopen({} as Event);
      }

      const updatedState = useAnalyticsStore.getState();
      expect(updatedState.realtime.isConnected).toBe(true);
      expect(updatedState.realtime.connectionStatus).toBe('connected');
      expect(updatedState.realtime.retryCount).toBe(0);
    });

    it('should handle real-time messages correctly', async () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        readyState: 1,
        url: '',
      };

      (EventSource as jest.MockedClass<typeof EventSource>).mockImplementation(() => mockEventSource as any);
      
      // Mock fetch responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { incidents: [{ id: '1', name: 'Test Incident' }] }
          })
        });

      const store = useAnalyticsStore.getState();
      store.startRealtimeConnection();

      // Simulate receiving a message
      const updateNotification = {
        type: 'data_update',
        timestamp: '2025-09-16T12:00:00Z',
        changes: {
          incidents: ['incident-1']
        },
        affectedEntities: []
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify(updateNotification)
        } as MessageEvent);
      }

      // Check that pending updates increased
      const stateAfterMessage = useAnalyticsStore.getState();
      expect(stateAfterMessage.realtime.pendingUpdates).toBe(1);
      expect(stateAfterMessage.realtime.lastUpdate).toBeInstanceOf(Date);
    });

    it('should handle connection errors and start fallback polling', () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        readyState: 1,
        url: '',
      };

      (EventSource as jest.MockedClass<typeof EventSource>).mockImplementation(() => mockEventSource as any);
      
      const store = useAnalyticsStore.getState();
      store.startRealtimeConnection();

      // Simulate connection error
      if (mockEventSource.onerror) {
        mockEventSource.onerror({} as Event);
      }

      const updatedState = useAnalyticsStore.getState();
      expect(updatedState.realtime.isConnected).toBe(false);
      expect(updatedState.realtime.connectionStatus).toBe('error');
      expect(updatedState.autoRefreshTimer).toBeTruthy();
    });

    it('should stop real-time connection correctly', () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        readyState: 1,
        url: '',
      };

      (EventSource as jest.MockedClass<typeof EventSource>).mockImplementation(() => mockEventSource as any);
      
      const store = useAnalyticsStore.getState();
      store.startRealtimeConnection();
      store.stopRealtimeConnection();

      expect(mockEventSource.close).toHaveBeenCalled();
      
      const updatedState = useAnalyticsStore.getState();
      expect(updatedState.eventSource).toBe(null);
      expect(updatedState.realtime.isConnected).toBe(false);
      expect(updatedState.realtime.connectionStatus).toBe('disconnected');
    });
  });

  describe('Fallback Polling', () => {
    it('should start fallback polling with 25-second interval', () => {
      const store = useAnalyticsStore.getState();
      
      store.startFallbackPolling();
      
      expect(store.autoRefreshTimer).toBeTruthy();
      
      // Fast-forward time to test interval
      jest.advanceTimersByTime(25000);
      
      // Should have called refreshData
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should stop fallback polling correctly', () => {
      const store = useAnalyticsStore.getState();
      
      store.startFallbackPolling();
      const timerId = store.autoRefreshTimer;
      
      store.stopFallbackPolling();
      
      const updatedState = useAnalyticsStore.getState();
      expect(updatedState.autoRefreshTimer).toBe(null);
    });

    it('should clear existing timer when starting new polling', () => {
      const store = useAnalyticsStore.getState();
      
      store.startFallbackPolling();
      const firstTimerId = store.autoRefreshTimer;
      
      store.startFallbackPolling();
      const secondTimerId = useAnalyticsStore.getState().autoRefreshTimer;
      
      expect(secondTimerId).toBeTruthy();
      expect(secondTimerId).not.toBe(firstTimerId);
    });
  });

  describe('Retry Logic', () => {
    it('should retry connection with exponential backoff', () => {
      const store = useAnalyticsStore.getState();
      
      // Set retry count to simulate previous failures
      useAnalyticsStore.setState({
        realtime: {
          ...store.realtime,
          retryCount: 2
        }
      });

      store.retryConnection();

      const updatedState = useAnalyticsStore.getState();
      expect(updatedState.realtime.retryCount).toBe(3);

      // Fast-forward time - should be 4000ms (1000 * 2^2)
      jest.advanceTimersByTime(4000);
      
      // Should have called startRealtimeConnection
      expect(EventSource).toHaveBeenCalled();
    });

    it('should not retry when max retries reached', () => {
      const store = useAnalyticsStore.getState();
      
      // Set retry count to max
      useAnalyticsStore.setState({
        realtime: {
          ...store.realtime,
          retryCount: 5,
          maxRetries: 5
        }
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      store.retryConnection();
      
      expect(consoleSpy).toHaveBeenCalledWith('Max retry attempts reached for real-time connection');
      
      const updatedState = useAnalyticsStore.getState();
      expect(updatedState.realtime.retryCount).toBe(5);
      
      consoleSpy.mockRestore();
    });

    it('should cap retry delay at 30 seconds', () => {
      const store = useAnalyticsStore.getState();
      
      // Set high retry count
      useAnalyticsStore.setState({
        realtime: {
          ...store.realtime,
          retryCount: 10 // This would normally give 1024 seconds delay
        }
      });

      store.retryConnection();

      // Fast-forward by 30 seconds (max delay)
      jest.advanceTimersByTime(30000);
      
      // Should have called startRealtimeConnection
      expect(EventSource).toHaveBeenCalled();
    });
  });

  describe('Update Handling', () => {
    it('should debounce rapid updates to prevent UI thrashing', async () => {
      const store = useAnalyticsStore.getState();
      
      const notification = {
        type: 'data_update' as const,
        timestamp: '2025-09-16T12:00:00Z',
        changes: {
          incidents: ['incident-1']
        },
        affectedEntities: []
      };

      // Call handleRealtimeUpdate multiple times rapidly
      store.handleRealtimeUpdate(notification);
      store.handleRealtimeUpdate(notification);
      store.handleRealtimeUpdate(notification);

      // Should have increased pending updates count
      const stateAfterUpdates = useAnalyticsStore.getState();
      expect(stateAfterUpdates.realtime.pendingUpdates).toBe(3);

      // Fast-forward past debounce period (300ms)
      jest.advanceTimersByTime(300);

      // Only one API call should have been made due to debouncing
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should update specific data based on notification changes', () => {
      const store = useAnalyticsStore.getState();
      
      // Set up selected incident
      useAnalyticsStore.setState({
        selectedIncident: {
          id: 'incident-1',
          name: 'Test Incident',
          type: 'EARTHQUAKE',
          status: 'ACTIVE' as any,
          declarationDate: '2025-09-16'
        }
      });

      const notification = {
        type: 'data_update' as const,
        timestamp: '2025-09-16T12:00:00Z',
        changes: {
          incidents: ['incident-1'],
          assessments: ['assessment-1'],
          responses: ['response-1']
        },
        affectedEntities: ['entity-1']
      };

      store.handleRealtimeUpdate(notification);

      // Fast-forward past debounce period
      jest.advanceTimersByTime(300);

      // Should have called appropriate fetch functions
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});