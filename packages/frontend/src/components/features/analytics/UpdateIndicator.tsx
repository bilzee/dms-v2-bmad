'use client';

import React from 'react';
import { useAnalyticsRealtime, useAnalyticsRefresh } from '@/stores/analytics.store';
import { cn } from '@/lib/utils/cn';

interface UpdateIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function UpdateIndicator({ className, showDetails = false }: UpdateIndicatorProps) {
  const { realtime } = useAnalyticsRealtime();
  const { lastRefresh } = useAnalyticsRefresh();

  const getStatusColor = () => {
    switch (realtime.connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      case 'disconnected':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (realtime.connectionStatus) {
      case 'connected':
        return 'Real-time updates active';
      case 'connecting':
        return 'Connecting to real-time updates...';
      case 'error':
        return 'Real-time connection failed, using polling';
      case 'disconnected':
        return 'Real-time updates disabled';
      default:
        return 'Unknown status';
    }
  };

  const formatLastUpdate = () => {
    if (!lastRefresh) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastRefresh.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else if (seconds > 30) {
      return `${seconds}s ago`;
    } else {
      return 'Just now';
    }
  };

  const formatLastRealtimeUpdate = () => {
    if (!realtime.lastUpdate) return 'No updates received';
    
    const now = new Date();
    const diff = now.getTime() - realtime.lastUpdate.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `Last update ${minutes}m ago`;
    } else if (seconds > 30) {
      return `Last update ${seconds}s ago`;
    } else {
      return 'Just updated';
    }
  };

  if (!showDetails) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div 
          className={cn('w-2 h-2 rounded-full', getStatusColor())}
          title={getStatusText()}
        />
        {realtime.pendingUpdates > 0 && (
          <span className="text-xs text-blue-600 font-medium">
            {realtime.pendingUpdates} update{realtime.pendingUpdates > 1 ? 's' : ''} pending
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', getStatusColor())} />
        <span className="text-xs text-gray-600">{getStatusText()}</span>
      </div>
      
      <div className="text-xs text-gray-500 space-y-0.5">
        <div>Data last refreshed: {formatLastUpdate()}</div>
        
        {realtime.isConnected && (
          <div>{formatLastRealtimeUpdate()}</div>
        )}
        
        {realtime.pendingUpdates > 0 && (
          <div className="text-blue-600 font-medium">
            {realtime.pendingUpdates} update{realtime.pendingUpdates > 1 ? 's' : ''} pending
          </div>
        )}
        
        {realtime.connectionStatus === 'error' && realtime.retryCount > 0 && (
          <div className="text-amber-600">
            Retry attempt {realtime.retryCount}/{realtime.maxRetries}
          </div>
        )}
      </div>
    </div>
  );
}

export default UpdateIndicator;