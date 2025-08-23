'use client';

import React, { useEffect, useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  ExternalLink,
  Eye
} from 'lucide-react';
import { useSyncStore } from '@/stores/sync.store';
import { useOfflineStore } from '@/stores/offline.store';
import type { OfflineQueueItem, AssessmentType } from '@dms/shared';

interface AssessmentSyncStatusProps {
  assessmentType: AssessmentType;
  affectedEntityId?: string;
  assessmentId?: string;
  className?: string;
  onViewQueue?: () => void;
}

// Helper function to determine sync status from queue item
const getSyncStatusFromQueueItem = (item: OfflineQueueItem | undefined) => {
  if (!item) return null;
  
  if (item.error && item.retryCount > 0) return 'failed';
  if (!item.error && item.retryCount === 0) return 'pending';
  if (!item.error && item.retryCount > 0) return 'syncing';
  return 'pending';
};

export const AssessmentSyncStatus: React.FC<AssessmentSyncStatusProps> = ({
  assessmentType,
  affectedEntityId,
  assessmentId,
  className = '',
  onViewQueue,
}) => {
  const { queue, queueSummary, loadQueueSummary } = useSyncStore();
  const { isOnline } = useOfflineStore();
  
  // Find relevant queue items for this assessment
  const relevantQueueItems = queue.filter(item => {
    // Match by assessment type and entity
    if (item.type === 'ASSESSMENT' && 
        item.data?.assessmentType === assessmentType &&
        (item.data?.affectedEntityId === affectedEntityId || item.entityId === affectedEntityId)) {
      return true;
    }
    
    // Match by specific assessment ID if provided
    if (assessmentId && (item.entityId === assessmentId || item.id === assessmentId)) {
      return true;
    }
    
    return false;
  });

  // Load queue summary on mount
  useEffect(() => {
    loadQueueSummary();
  }, [loadQueueSummary]);

  // Determine overall status
  const getOverallStatus = () => {
    if (!isOnline) {
      return {
        status: 'offline' as const,
        icon: WifiOff,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        message: 'Offline - Changes saved locally',
      };
    }

    if (relevantQueueItems.length === 0) {
      return {
        status: 'synced' as const,
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        message: 'All changes synced',
      };
    }

    const failedItems = relevantQueueItems.filter(item => item.error && item.retryCount > 0);
    const syncingItems = relevantQueueItems.filter(item => !item.error && item.retryCount > 0);
    const pendingItems = relevantQueueItems.filter(item => !item.error && item.retryCount === 0);

    if (failedItems.length > 0) {
      return {
        status: 'failed' as const,
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        message: `${failedItems.length} sync failure${failedItems.length > 1 ? 's' : ''}`,
        items: failedItems,
      };
    }

    if (syncingItems.length > 0) {
      return {
        status: 'syncing' as const,
        icon: RefreshCw,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        message: `${syncingItems.length} item${syncingItems.length > 1 ? 's' : ''} syncing`,
        items: syncingItems,
      };
    }

    if (pendingItems.length > 0) {
      return {
        status: 'pending' as const,
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        message: `${pendingItems.length} item${pendingItems.length > 1 ? 's' : ''} pending sync`,
        items: pendingItems,
      };
    }

    return {
      status: 'synced' as const,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      message: 'All changes synced',
    };
  };

  const statusInfo = getOverallStatus();
  const StatusIcon = statusInfo.icon;

  // Health emergency indicator
  const hasHealthEmergency = relevantQueueItems.some(
    item => item.type === 'ASSESSMENT' && 
           item.data?.assessmentType === 'HEALTH' && 
           item.priority === 'HIGH'
  );

  return (
    <div className={`${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-md p-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          <div className="flex items-center gap-2">
            <StatusIcon 
              className={`w-4 h-4 ${statusInfo.color} ${statusInfo.status === 'syncing' ? 'animate-spin' : ''}`} 
            />
            {!isOnline && <WifiOff className="w-3 h-3 text-gray-500" />}
            {isOnline && <Wifi className="w-3 h-3 text-green-500" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.message}
              </span>
              {hasHealthEmergency && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-red-100 text-red-800 rounded-full">
                  🚨 Health Emergency
                </span>
              )}
            </div>
            
            {/* Show details for failed items */}
            {statusInfo.status === 'failed' && statusInfo.items && (
              <div className="mt-1 text-xs text-red-600">
                Latest error: {statusInfo.items[0].error}
              </div>
            )}
            
            {/* Show retry info for syncing items */}
            {statusInfo.status === 'syncing' && statusInfo.items && statusInfo.items.length === 1 && (
              <div className="mt-1 text-xs text-blue-600">
                Retry attempt {statusInfo.items[0].retryCount}
                {statusInfo.items[0].lastAttempt && (
                  <> • Last: {new Date(statusInfo.items[0].lastAttempt).toLocaleTimeString()}</>
                )}
              </div>
            )}
            
            {/* Show pending time for pending items */}
            {statusInfo.status === 'pending' && statusInfo.items && statusInfo.items.length === 1 && (
              <div className="mt-1 text-xs text-yellow-600">
                Created: {new Date(statusInfo.items[0].createdAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {relevantQueueItems.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border rounded text-gray-600">
              {relevantQueueItems.length} queued
            </span>
          )}
          
          {onViewQueue && (queueSummary?.totalItems ?? 0) > 0 && (
            <button
              onClick={onViewQueue}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors"
              title="View sync queue"
            >
              <Eye className="w-3 h-3" />
              Queue
            </button>
          )}
        </div>
      </div>

      {/* Queue summary info */}
      {queueSummary && queueSummary.totalItems > relevantQueueItems.length && (
        <div className="mt-2 pt-2 border-t border-current opacity-60">
          <div className="flex items-center justify-between text-xs">
            <span>
              System-wide: {queueSummary.totalItems} total, {queueSummary.failedItems} failed
            </span>
            {queueSummary.highPriorityItems > 0 && (
              <span className="text-red-600 font-medium">
                {queueSummary.highPriorityItems} high priority
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for smaller spaces
export const CompactAssessmentSyncStatus: React.FC<AssessmentSyncStatusProps & { 
  showLabel?: boolean;
}> = ({ 
  assessmentType, 
  affectedEntityId, 
  assessmentId, 
  className = '', 
  showLabel = true,
  onViewQueue 
}) => {
  const { queue } = useSyncStore();
  const { isOnline } = useOfflineStore();

  // Find relevant queue items
  const relevantQueueItems = queue.filter(item => {
    if (item.type === 'ASSESSMENT' && 
        item.data?.assessmentType === assessmentType &&
        (item.data?.affectedEntityId === affectedEntityId || item.entityId === affectedEntityId)) {
      return true;
    }
    if (assessmentId && (item.entityId === assessmentId || item.id === assessmentId)) {
      return true;
    }
    return false;
  });

  if (!isOnline && relevantQueueItems.length === 0) {
    return (
      <div className={`inline-flex items-center gap-1 text-sm ${className}`}>
        <WifiOff className="w-4 h-4 text-gray-500" />
        {showLabel && <span className="text-gray-600">Offline</span>}
      </div>
    );
  }

  if (relevantQueueItems.length === 0) {
    return (
      <div className={`inline-flex items-center gap-1 text-sm ${className}`}>
        <CheckCircle className="w-4 h-4 text-green-600" />
        {showLabel && <span className="text-green-600">Synced</span>}
      </div>
    );
  }

  const failedItems = relevantQueueItems.filter(item => item.error && item.retryCount > 0);
  const syncingItems = relevantQueueItems.filter(item => !item.error && item.retryCount > 0);

  if (failedItems.length > 0) {
    return (
      <button
        onClick={onViewQueue}
        className={`inline-flex items-center gap-1 text-sm hover:underline ${className}`}
        title="Click to view sync queue"
      >
        <XCircle className="w-4 h-4 text-red-600" />
        {showLabel && <span className="text-red-600">Failed ({failedItems.length})</span>}
      </button>
    );
  }

  if (syncingItems.length > 0) {
    return (
      <div className={`inline-flex items-center gap-1 text-sm ${className}`}>
        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
        {showLabel && <span className="text-blue-600">Syncing</span>}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <Clock className="w-4 h-4 text-yellow-600" />
      {showLabel && <span className="text-yellow-600">Pending ({relevantQueueItems.length})</span>}
    </div>
  );
};