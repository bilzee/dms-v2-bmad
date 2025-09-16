import React from 'react';
import { render, screen } from '@testing-library/react';
import { UpdateIndicator } from '@/components/features/analytics/UpdateIndicator';
import { useAnalyticsRealtime, useAnalyticsRefresh } from '@/stores/analytics.store';

// Mock the analytics store
jest.mock('@/stores/analytics.store', () => ({
  useAnalyticsRealtime: jest.fn(),
  useAnalyticsRefresh: jest.fn(),
}));

const mockUseAnalyticsRealtime = useAnalyticsRealtime as jest.MockedFunction<typeof useAnalyticsRealtime>;
const mockUseAnalyticsRefresh = useAnalyticsRefresh as jest.MockedFunction<typeof useAnalyticsRefresh>;

describe('UpdateIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAnalyticsRefresh.mockReturnValue({
      lastRefresh: new Date(),
      refreshData: jest.fn(),
      error: null,
      isLoading: false,
    });
  });

  describe('Connection Status Indicator', () => {
    it('should show green indicator when connected', () => {
      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: true,
          connectionStatus: 'connected',
          lastUpdate: new Date(),
          pendingUpdates: 0,
          retryCount: 0,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator />);
      
      const indicator = document.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should show yellow pulsing indicator when connecting', () => {
      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: false,
          connectionStatus: 'connecting',
          lastUpdate: null,
          pendingUpdates: 0,
          retryCount: 0,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator />);
      
      const indicator = document.querySelector('.bg-yellow-500.animate-pulse');
      expect(indicator).toBeInTheDocument();
    });

    it('should show red indicator when connection has error', () => {
      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: false,
          connectionStatus: 'error',
          lastUpdate: null,
          pendingUpdates: 0,
          retryCount: 2,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator />);
      
      const indicator = document.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should show gray indicator when disconnected', () => {
      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: false,
          connectionStatus: 'disconnected',
          lastUpdate: null,
          pendingUpdates: 0,
          retryCount: 0,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator />);
      
      const indicator = document.querySelector('.bg-gray-400');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Pending Updates', () => {
    it('should show pending updates count when there are updates', () => {
      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: true,
          connectionStatus: 'connected',
          lastUpdate: new Date(),
          pendingUpdates: 3,
          retryCount: 0,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator />);
      
      expect(screen.getByText('3 updates pending')).toBeInTheDocument();
    });

    it('should show singular "update" for single pending update', () => {
      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: true,
          connectionStatus: 'connected',
          lastUpdate: new Date(),
          pendingUpdates: 1,
          retryCount: 0,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator />);
      
      expect(screen.getByText('1 update pending')).toBeInTheDocument();
    });

    it('should not show pending updates when count is zero', () => {
      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: true,
          connectionStatus: 'connected',
          lastUpdate: new Date(),
          pendingUpdates: 0,
          retryCount: 0,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator />);
      
      expect(screen.queryByText(/updates? pending/)).not.toBeInTheDocument();
    });
  });

  describe('Detailed View', () => {
    it('should show detailed information when showDetails is true', () => {
      const lastRefresh = new Date('2025-09-16T12:00:00Z');
      const lastUpdate = new Date('2025-09-16T12:01:00Z');

      mockUseAnalyticsRefresh.mockReturnValue({
        lastRefresh,
        refreshData: jest.fn(),
        error: null,
        isLoading: false,
      });

      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: true,
          connectionStatus: 'connected',
          lastUpdate,
          pendingUpdates: 0,
          retryCount: 0,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator showDetails={true} />);
      
      expect(screen.getByText('Real-time updates active')).toBeInTheDocument();
      expect(screen.getByText(/Data last refreshed:/)).toBeInTheDocument();
    });

    it('should show retry attempt information when there are retries', () => {
      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: false,
          connectionStatus: 'error',
          lastUpdate: null,
          pendingUpdates: 0,
          retryCount: 2,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator showDetails={true} />);
      
      expect(screen.getByText('Retry attempt 2/5')).toBeInTheDocument();
    });

    it('should format "Never" when lastRefresh is null', () => {
      mockUseAnalyticsRefresh.mockReturnValue({
        lastRefresh: null,
        refreshData: jest.fn(),
        error: null,
        isLoading: false,
      });

      mockUseAnalyticsRealtime.mockReturnValue({
        realtime: {
          isConnected: true,
          connectionStatus: 'connected',
          lastUpdate: new Date(),
          pendingUpdates: 0,
          retryCount: 0,
          maxRetries: 5,
        },
        startRealtimeConnection: jest.fn(),
        stopRealtimeConnection: jest.fn(),
        startFallbackPolling: jest.fn(),
        stopFallbackPolling: jest.fn(),
      });

      render(<UpdateIndicator showDetails={true} />);
      
      expect(screen.getByText('Data last refreshed: Never')).toBeInTheDocument();
    });
  });
});