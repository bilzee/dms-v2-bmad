'use client';

import React, { useEffect, useRef } from 'react';
import { useAnalyticsRealtime } from '@/stores/analytics.store';

interface RealtimeConnectionProps {
  autoConnect?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
  onUpdate?: (notification: any) => void;
}

export function RealtimeConnection({ 
  autoConnect = true, 
  onConnectionChange,
  onUpdate 
}: RealtimeConnectionProps) {
  const { realtime, startRealtimeConnection, stopRealtimeConnection } = useAnalyticsRealtime();
  const previousConnectionStatus = useRef(realtime.connectionStatus);

  useEffect(() => {
    if (autoConnect) {
      startRealtimeConnection();
    }

    // Cleanup on unmount
    return () => {
      stopRealtimeConnection();
    };
  }, [autoConnect, startRealtimeConnection, stopRealtimeConnection]);

  // Handle connection status changes
  useEffect(() => {
    if (previousConnectionStatus.current !== realtime.connectionStatus) {
      const isConnected = realtime.connectionStatus === 'connected';
      onConnectionChange?.(isConnected);
      previousConnectionStatus.current = realtime.connectionStatus;
    }
  }, [realtime.connectionStatus, onConnectionChange]);

  // Handle updates
  useEffect(() => {
    if (realtime.lastUpdate && onUpdate) {
      onUpdate({
        type: 'data_update',
        timestamp: realtime.lastUpdate.toISOString(),
        pendingUpdates: realtime.pendingUpdates
      });
    }
  }, [realtime.lastUpdate, realtime.pendingUpdates, onUpdate]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoConnect) {
        // Restart connection when page becomes visible
        if (realtime.connectionStatus === 'disconnected' || realtime.connectionStatus === 'error') {
          startRealtimeConnection();
        }
      } else if (document.visibilityState === 'hidden') {
        // Optionally stop connection when page is hidden to save resources
        // Commented out as we want to keep receiving updates even when tab is not active
        // stopRealtimeConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoConnect, realtime.connectionStatus, startRealtimeConnection]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (autoConnect && realtime.connectionStatus !== 'connected') {
        startRealtimeConnection();
      }
    };

    const handleOffline = () => {
      stopRealtimeConnection();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoConnect, realtime.connectionStatus, startRealtimeConnection, stopRealtimeConnection]);

  // This component doesn't render anything - it's just for connection management
  return null;
}

export default RealtimeConnection;