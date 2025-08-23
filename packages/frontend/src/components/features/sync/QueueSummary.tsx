'use client';

import React, { useEffect } from 'react';
import { Clock, AlertTriangle, RefreshCw, ArrowRight, TrendingUp } from 'lucide-react';
import { useSyncStore } from '@/stores/sync.store';

interface QueueSummaryProps {
  className?: string;
  onViewQueue?: () => void;
}

export const QueueSummary: React.FC<QueueSummaryProps> = ({ 
  className = '', 
  onViewQueue 
}) => {
  const { queueSummary, loadQueueSummary } = useSyncStore();

  // Load summary on component mount
  useEffect(() => {
    loadQueueSummary();
    
    // Set up interval for periodic updates
    const interval = setInterval(loadQueueSummary, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [loadQueueSummary]);

  if (!queueSummary) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  const {
    totalItems,
    pendingItems,
    failedItems,
    syncingItems,
    highPriorityItems,
    lastUpdated,
    oldestPendingItem,
  } = queueSummary;

  // Determine overall queue status
  const getQueueStatus = () => {
    if (failedItems > 0) return { status: 'error', color: 'red', message: 'Items need attention' };
    if (syncingItems > 0) return { status: 'syncing', color: 'blue', message: 'Syncing in progress' };
    if (pendingItems > 0) return { status: 'pending', color: 'yellow', message: 'Items pending sync' };
    return { status: 'synced', color: 'green', message: 'All items synced' };
  };

  const queueStatus = getQueueStatus();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sync Queue</h3>
          <p className="text-sm text-gray-500">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        
        {totalItems > 0 && (
          <button
            onClick={onViewQueue}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Queue
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status indicator */}
      <div className={`flex items-center gap-2 p-3 rounded-md mb-4 bg-${queueStatus.color}-50 border border-${queueStatus.color}-200`}>
        {queueStatus.status === 'error' && <AlertTriangle className={`w-5 h-5 text-${queueStatus.color}-600`} />}
        {queueStatus.status === 'syncing' && <RefreshCw className={`w-5 h-5 text-${queueStatus.color}-600 animate-spin`} />}
        {queueStatus.status === 'pending' && <Clock className={`w-5 h-5 text-${queueStatus.color}-600`} />}
        {queueStatus.status === 'synced' && <RefreshCw className={`w-5 h-5 text-${queueStatus.color}-600`} />}
        
        <div>
          <p className={`text-sm font-medium text-${queueStatus.color}-800`}>
            {queueStatus.message}
          </p>
          <p className={`text-xs text-${queueStatus.color}-600`}>
            {totalItems} total items in queue
          </p>
        </div>
      </div>

      {/* Statistics */}
      {totalItems > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Pending items */}
          <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-2xl font-bold text-yellow-800">{pendingItems}</div>
            <div className="text-xs text-yellow-600 uppercase tracking-wide">Pending</div>
          </div>

          {/* Failed items */}
          <div className="text-center p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-2xl font-bold text-red-800">{failedItems}</div>
            <div className="text-xs text-red-600 uppercase tracking-wide">Failed</div>
          </div>

          {/* High priority items */}
          <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="text-2xl font-bold text-orange-800">{highPriorityItems}</div>
            <div className="text-xs text-orange-600 uppercase tracking-wide">High Priority</div>
          </div>

          {/* Syncing items */}
          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-2xl font-bold text-blue-800">{syncingItems}</div>
            <div className="text-xs text-blue-600 uppercase tracking-wide">Syncing</div>
          </div>
        </div>
      )}

      {/* Oldest pending item alert */}
      {oldestPendingItem && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">Oldest pending item:</p>
              <p className="text-xs text-amber-600 truncate">
                {oldestPendingItem.type} ({oldestPendingItem.priority} priority)
              </p>
              <p className="text-xs text-amber-600">
                {new Date(oldestPendingItem.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalItems === 0 && (
        <div className="text-center py-4">
          <RefreshCw className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900 mb-1">All caught up!</p>
          <p className="text-xs text-gray-500">No items in the sync queue.</p>
        </div>
      )}
    </div>
  );
};