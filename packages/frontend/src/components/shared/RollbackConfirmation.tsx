/**
 * RollbackConfirmation - Confirmation dialog for rollback operations
 * 
 * Provides clear confirmation dialog with rollback details and consequences
 * before performing rollback operations on optimistic updates.
 */

'use client';

import React from 'react';
import { useSyncStore } from '@/stores/sync.store';
import { cn } from '@/lib/utils/cn';
import { 
  AlertTriangle,
  RotateCcw,
  X,
  CheckCircle2
} from 'lucide-react';

export interface RollbackOperation {
  updateId: string;
  entityId: string;
  entityType: string;
  reason: 'USER_INITIATED' | 'SYNC_FAILED' | 'VALIDATION_ERROR';
  rollbackData: any;
  confirmationRequired: boolean;
  confirmationMessage: string;
}

export interface RollbackConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rollbackOperation: RollbackOperation | null;
  isLoading?: boolean;
  className?: string;
}

export const RollbackConfirmation: React.FC<RollbackConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  rollbackOperation,
  isLoading = false,
  className,
}) => {
  const { optimisticUpdates } = useSyncStore();

  if (!isOpen || !rollbackOperation) {
    return null;
  }

  const update = optimisticUpdates.get(rollbackOperation.updateId);

  const getRollbackDetails = () => {
    switch (rollbackOperation.reason) {
      case 'USER_INITIATED':
        return {
          title: 'Confirm Rollback',
          description: 'You are about to undo the changes made to this item. This action cannot be undone.',
          severity: 'warning' as const,
        };
      case 'SYNC_FAILED':
        return {
          title: 'Sync Failed - Rollback Required',
          description: 'The changes could not be synchronized with the server. Rolling back will restore the previous state.',
          severity: 'error' as const,
        };
      case 'VALIDATION_ERROR':
        return {
          title: 'Validation Error - Rollback Required',
          description: 'The changes failed validation. Rolling back will restore the item to a valid state.',
          severity: 'error' as const,
        };
      default:
        return {
          title: 'Confirm Rollback',
          description: 'You are about to rollback changes to this item.',
          severity: 'warning' as const,
        };
    }
  };

  const rollbackDetails = getRollbackDetails();

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'ASSESSMENT': return 'Assessment';
      case 'RESPONSE': return 'Response';
      case 'INCIDENT': return 'Incident';
      case 'ENTITY': return 'Entity';
      default: return 'Item';
    }
  };

  const getOperationLabel = (operation: string) => {
    switch (operation) {
      case 'CREATE': return 'creation';
      case 'UPDATE': return 'update';
      case 'DELETE': return 'deletion';
      default: return 'change';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Dialog */}
      <div className={cn(
        'fixed inset-0 flex items-center justify-center z-50',
        className
      )}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={cn(
                'p-2 rounded-full',
                rollbackDetails.severity === 'error' 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-yellow-100 text-yellow-600'
              )}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {rollbackDetails.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              {rollbackDetails.description}
            </p>

            {/* Operation Details */}
            {update && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium">{getEntityTypeLabel(update.entityType)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Operation:</span>
                  <span className="font-medium">{getOperationLabel(update.operation)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Entity ID:</span>
                  <span className="font-mono text-xs">{update.entityId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-sm">
                    {new Date(update.timestamp).toLocaleString()}
                  </span>
                </div>
                {update.error && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-gray-500 text-sm">Error:</span>
                    <p className="text-red-600 text-sm mt-1">{update.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Custom Message */}
            {rollbackOperation.confirmationMessage && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm">
                  {rollbackOperation.confirmationMessage}
                </p>
              </div>
            )}

            {/* Consequences */}
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-900">What will happen:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {update?.operation === 'CREATE' && (
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>The newly created item will be removed</span>
                  </li>
                )}
                {update?.operation === 'UPDATE' && (
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Changes will be reverted to the previous state</span>
                  </li>
                )}
                {update?.operation === 'DELETE' && (
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>The item will be restored</span>
                  </li>
                )}
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>The sync queue item will be removed</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              <span>Rollback Changes</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RollbackConfirmation;