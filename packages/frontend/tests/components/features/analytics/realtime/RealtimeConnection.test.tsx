import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RealtimeConnection } from '@/components/features/analytics/realtime/RealtimeConnection';
import { useAnalyticsRealtime } from '@/stores/analytics.store';

// Mock the analytics store
jest.mock('@/stores/analytics.store', () => ({
  useAnalyticsRealtime: jest.fn(),
}));

const mockUseAnalyticsRealtime = useAnalyticsRealtime as jest.MockedFunction<typeof useAnalyticsRealtime>;

describe('RealtimeConnection', () => {
  const mockStartRealtimeConnection = jest.fn();
  const mockStopRealtimeConnection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAnalyticsRealtime.mockReturnValue({
      realtime: {
        isConnected: false,
        connectionStatus: 'disconnected',
        lastUpdate: null,
        pendingUpdates: 0,
        retryCount: 0,
        maxRetries: 5,
      },
      startRealtimeConnection: mockStartRealtimeConnection,
      stopRealtimeConnection: mockStopRealtimeConnection,
      startFallbackPolling: jest.fn(),
      stopFallbackPolling: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should start real-time connection on mount when autoConnect is true', () => {
    render(<RealtimeConnection autoConnect={true} />);
    
    expect(mockStartRealtimeConnection).toHaveBeenCalledTimes(1);
  });

  it('should not start real-time connection on mount when autoConnect is false', () => {
    render(<RealtimeConnection autoConnect={false} />);
    
    expect(mockStartRealtimeConnection).not.toHaveBeenCalled();
  });

  it('should stop real-time connection on unmount', () => {
    const { unmount } = render(<RealtimeConnection autoConnect={true} />);
    
    unmount();
    
    expect(mockStopRealtimeConnection).toHaveBeenCalledTimes(1);
  });

  it('should call onConnectionChange when connection status changes', async () => {
    const mockOnConnectionChange = jest.fn();
    
    // Start with disconnected
    mockUseAnalyticsRealtime.mockReturnValue({
      realtime: {
        isConnected: false,
        connectionStatus: 'disconnected',
        lastUpdate: null,
        pendingUpdates: 0,
        retryCount: 0,
        maxRetries: 5,
      },
      startRealtimeConnection: mockStartRealtimeConnection,
      stopRealtimeConnection: mockStopRealtimeConnection,
      startFallbackPolling: jest.fn(),
      stopFallbackPolling: jest.fn(),
    });

    const { rerender } = render(
      <RealtimeConnection 
        autoConnect={true} 
        onConnectionChange={mockOnConnectionChange}
      />
    );

    // Change to connected
    mockUseAnalyticsRealtime.mockReturnValue({
      realtime: {
        isConnected: true,
        connectionStatus: 'connected',
        lastUpdate: null,
        pendingUpdates: 0,
        retryCount: 0,
        maxRetries: 5,
      },
      startRealtimeConnection: mockStartRealtimeConnection,
      stopRealtimeConnection: mockStopRealtimeConnection,
      startFallbackPolling: jest.fn(),
      stopFallbackPolling: jest.fn(),
    });

    rerender(
      <RealtimeConnection 
        autoConnect={true} 
        onConnectionChange={mockOnConnectionChange}
      />
    );

    await waitFor(() => {
      expect(mockOnConnectionChange).toHaveBeenCalledWith(true);
    });
  });

  it('should call onUpdate when updates are received', async () => {
    const mockOnUpdate = jest.fn();
    const mockLastUpdate = new Date();
    
    mockUseAnalyticsRealtime.mockReturnValue({
      realtime: {
        isConnected: true,
        connectionStatus: 'connected',
        lastUpdate: mockLastUpdate,
        pendingUpdates: 1,
        retryCount: 0,
        maxRetries: 5,
      },
      startRealtimeConnection: mockStartRealtimeConnection,
      stopRealtimeConnection: mockStopRealtimeConnection,
      startFallbackPolling: jest.fn(),
      stopFallbackPolling: jest.fn(),
    });

    render(
      <RealtimeConnection 
        autoConnect={true} 
        onUpdate={mockOnUpdate}
      />
    );

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        type: 'data_update',
        timestamp: mockLastUpdate.toISOString(),
        pendingUpdates: 1
      });
    });
  });

  it('should handle page visibility changes', () => {
    render(<RealtimeConnection autoConnect={true} />);
    
    // Mock connection status as error
    mockUseAnalyticsRealtime.mockReturnValue({
      realtime: {
        isConnected: false,
        connectionStatus: 'error',
        lastUpdate: null,
        pendingUpdates: 0,
        retryCount: 1,
        maxRetries: 5,
      },
      startRealtimeConnection: mockStartRealtimeConnection,
      stopRealtimeConnection: mockStopRealtimeConnection,
      startFallbackPolling: jest.fn(),
      stopFallbackPolling: jest.fn(),
    });

    // Simulate page becoming visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true
    });

    const event = new Event('visibilitychange');
    document.dispatchEvent(event);

    expect(mockStartRealtimeConnection).toHaveBeenCalledTimes(2); // Initial + visibility change
  });

  it('should handle online/offline events', () => {
    render(<RealtimeConnection autoConnect={true} />);
    
    // Simulate going offline
    const offlineEvent = new Event('offline');
    window.dispatchEvent(offlineEvent);
    
    expect(mockStopRealtimeConnection).toHaveBeenCalledTimes(1);

    // Simulate going online
    const onlineEvent = new Event('online');
    window.dispatchEvent(onlineEvent);
    
    expect(mockStartRealtimeConnection).toHaveBeenCalledTimes(2); // Initial + online event
  });
});