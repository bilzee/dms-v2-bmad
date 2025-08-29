/**
 * EntitySyncStatus - Per-entity sync status indicator
 * 
 * Shows sync status for individual entities with optimistic update tracking,
 * retry capabilities, and rollback options.
 */

'use client';

import React from 'react';
import { useSyncStore } from '@/stores/sync.store';
import { cn } from '@/lib/utils/cn';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  RotateCcw,
  X 
} from 'lucide-react';

export interface EntitySyncStatusProps {
  entityId: string;
  entityType: 'ASSESSMENT' | 'RESPONSE' | 'INCIDENT' | 'ENTITY';
  className?: string;
  showActions?: boolean;
  onRetry?: () => void;
  onRollback?: () => void;
}

export const EntitySyncStatus: React.FC<EntitySyncStatusProps> = ({
  entityId,
  entityType,
  className,
  showActions = false,
  onRetry,
  onRollback,
}) => {
  const {
    optimisticUpdates,
    pendingOperations,
    getOptimisticEntityState,
    retryOptimisticUpdate,
    rollbackOptimisticUpdate,
    rollbackInProgress,
  } = useSyncStore();

  const entityState = getOptimisticEntityState(entityId, entityType);
  const isPending = pendingOperations.has(entityId);
  
  // Find the optimistic update for this entity
  const entityUpdate = Array.from(optimisticUpdates.values())
    .find(update => update.entityId === entityId && update.entityType === entityType);

  // Determine sync status
  const getSyncStatus = () => {
    if (entityState) {
      return {
        status: entityState.syncStatus,
        canRetry: entityState.canRetry,
        canRollback: entityState.canRollback,
        errorMessage: entityState.errorMessage,
        retryCount: entityState.retryCount,
      };
    }

    if (entityUpdate) {
      return {
        status: entityUpdate.status === 'PENDING' ? 'PENDING' : 
                entityUpdate.status === 'CONFIRMED' ? 'SYNCED' :
                entityUpdate.status === 'FAILED' ? 'FAILED' : 'ROLLED_BACK',
        canRetry: entityUpdate.status === 'FAILED' && entityUpdate.retryCount < entityUpdate.maxRetries,
        canRollback: entityUpdate.status === 'FAILED' || entityUpdate.status === 'PENDING',
        errorMessage: entityUpdate.error,
        retryCount: entityUpdate.retryCount,
      };
    }

    // Default to synced if no optimistic update found
    return {
      status: 'SYNCED' as const,
      canRetry: false,
      canRollback: false,
      errorMessage: undefined,
      retryCount: 0,
    };
  };

  const syncStatus = getSyncStatus();

  // Get status display properties
  const getStatusDisplay = () => {
    switch (syncStatus.status) {
      case 'PENDING':
        return {
          icon: <Clock className="w-3 h-3" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Pending',
          description: 'Waiting to sync',
        };
      case 'SYNCING':
        return {
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Syncing',
          description: 'Sync in progress',
        };
      case 'FAILED':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Failed',
          description: syncStatus.errorMessage || 'Sync failed',
        };
      case 'ROLLED_BACK':
        return {
          icon: <RotateCcw className="w-3 h-3" />,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          label: 'Rolled back',
          description: 'Changes reverted',
        };
      case 'SYNCED':
      default:
        return {
          icon: <CheckCircle2 className="w-3 h-3" />,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Synced',
          description: 'Up to date',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  const handleRetry = async () => {
    if (entityUpdate && syncStatus.canRetry) {
      try {
        await retryOptimisticUpdate(entityUpdate.id);
        onRetry?.();
      } catch (error) {
        console.error('Failed to retry update:', error);
      }
    }
  };

  const handleRollback = async () => {
    if (entityUpdate && syncStatus.canRollback) {
      try {
        await rollbackOptimisticUpdate(entityUpdate.id);
        onRollback?.();
      } catch (error) {
        console.error('Failed to rollback update:', error);
      }
    }
  };

  // Don't render if entity is fully synced and no actions needed
  if (syncStatus.status === 'SYNCED' && !showActions) {
    return null;
  }

  return (
    <div className={cn(
      'inline-flex items-center space-x-2 px-2 py-1 rounded-md border text-xs',
      statusDisplay.bgColor,
      statusDisplay.borderColor,
      className
    )}>
      {/* Status Icon and Label */}
      <div className={cn('flex items-center space-x-1', statusDisplay.color)}>
        {statusDisplay.icon}
        <span className="font-medium">{statusDisplay.label}</span>
      </div>

      {/* Retry Count */}
      {syncStatus.retryCount > 0 && (
        <span className="text-gray-500">
          (#{syncStatus.retryCount})
        </span>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center space-x-1 ml-2 pl-2 border-l border-gray-200">
          {syncStatus.canRetry && (
            <button
              onClick={handleRetry}
              disabled={rollbackInProgress}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Retry sync"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          
          {syncStatus.canRollback && (
            <button
              onClick={handleRollback}
              disabled={rollbackInProgress}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Rollback changes"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Error Details (on hover) */}
      {syncStatus.errorMessage && (
        <div className="group relative">
          <AlertCircle className="w-3 h-3 text-red-400" />
          <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-10">
            {syncStatus.errorMessage}
          </div>
        </div>
      )}
    </div>
  );
};

export default EntitySyncStatus;