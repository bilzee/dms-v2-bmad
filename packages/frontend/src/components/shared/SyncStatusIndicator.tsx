/**
 * SyncStatusIndicator - Global sync status display component
 * 
 * Shows overall sync status, pending operations, and sync progress
 * with real-time updates and user-friendly indicators.
 */

'use client';

import React from 'react';
import { useSyncStore } from '@/stores/sync.store';
import { cn } from '@/lib/utils/cn';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  X 
} from 'lucide-react';

export interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  showDetails = false,
  className,
  compact = false,
}) => {
  const {
    optimisticUpdates,
    pendingOperations,
    rollbackInProgress,
    connectivityStatus,
    backgroundSyncProgress,
    queueSummary,
    isRefreshing,
    getOptimisticStats,
  } = useSyncStore();

  const optimisticStats = getOptimisticStats();
  const isOnline = connectivityStatus?.isOnline ?? true;
  const pendingCount = optimisticStats.pendingUpdates + (queueSummary?.pendingItems || 0);
  const failedCount = optimisticStats.failedUpdates + (queueSummary?.failedItems || 0);

  // Determine overall sync status
  const getSyncStatus = (): {
    status: 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE';
    label: string;
    color: string;
    icon: React.ReactNode;
  } => {
    if (!isOnline) {
      return {
        status: 'OFFLINE',
        label: 'Offline',
        color: 'text-gray-500',
        icon: <WifiOff className="w-4 h-4" />,
      };
    }

    if (rollbackInProgress || isRefreshing || backgroundSyncProgress) {
      return {
        status: 'SYNCING',
        label: rollbackInProgress ? 'Rolling back...' : 'Syncing...',
        color: 'text-blue-500',
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
      };
    }

    if (failedCount > 0) {
      return {
        status: 'ERROR',
        label: `${failedCount} failed`,
        color: 'text-red-500',
        icon: <AlertCircle className="w-4 h-4" />,
      };
    }

    if (pendingCount > 0) {
      return {
        status: 'SYNCING',
        label: `${pendingCount} pending`,
        color: 'text-yellow-500',
        icon: <Clock className="w-4 h-4" />,
      };
    }

    return {
      status: 'IDLE',
      label: 'Up to date',
      color: 'text-green-500',
      icon: <CheckCircle2 className="w-4 h-4" />,
    };
  };

  const syncStatus = getSyncStatus();

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className={cn('flex items-center', syncStatus.color)}>
          {syncStatus.icon}
        </div>
        {pendingCount > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            {pendingCount}
          </span>
        )}
        {failedCount > 0 && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
            {failedCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-3 p-3 bg-white rounded-lg border shadow-sm', className)}>
      {/* Status Icon and Label */}
      <div className="flex items-center space-x-2">
        <div className={cn('flex items-center', syncStatus.color)}>
          {syncStatus.icon}
        </div>
        <span className="text-sm font-medium text-gray-900">
          {syncStatus.label}
        </span>
      </div>

      {/* Connection Status */}
      <div className="flex items-center space-x-1">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-xs text-gray-500">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Sync Progress */}
      {backgroundSyncProgress && (
        <div className="flex items-center space-x-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${(backgroundSyncProgress.completedItems / backgroundSyncProgress.totalItems) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {backgroundSyncProgress.completedItems}/{backgroundSyncProgress.totalItems}
          </span>
        </div>
      )}

      {/* Counters */}
      <div className="flex items-center space-x-4">
        {pendingCount > 0 && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-yellow-500" />
            <span className="text-xs text-gray-600">{pendingCount}</span>
          </div>
        )}
        
        {failedCount > 0 && (
          <div className="flex items-center space-x-1">
            <X className="w-3 h-3 text-red-500" />
            <span className="text-xs text-gray-600">{failedCount}</span>
          </div>
        )}

        {optimisticStats.confirmedUpdates > 0 && (
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="text-xs text-gray-600">{optimisticStats.confirmedUpdates}</span>
          </div>
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="text-xs text-gray-500">
          Last sync: {queueSummary?.lastUpdated 
            ? new Date(queueSummary.lastUpdated).toLocaleTimeString() 
            : 'Never'}
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;