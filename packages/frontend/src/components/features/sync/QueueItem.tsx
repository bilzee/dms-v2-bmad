'use client';

import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, Clock, CheckCircle, XCircle, MoreVertical, Eye, Trash2 } from 'lucide-react';
import type { OfflineQueueItem } from '@dms/shared';

interface QueueItemProps {
  item: OfflineQueueItem;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onViewDetails?: (item: OfflineQueueItem) => void;
  showActions?: boolean;
  compact?: boolean;
}

// Helper function to determine queue item status
const getItemStatus = (item: OfflineQueueItem): 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED' => {
  if (item.error && item.retryCount > 0) return 'FAILED';
  if (!item.error && item.retryCount === 0) return 'PENDING';
  if (!item.error && item.retryCount > 0) return 'SYNCING';
  return 'PENDING';
};

// Status badge component
const StatusBadge: React.FC<{ status: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED' }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'PENDING':
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        };
      case 'SYNCING':
        return {
          icon: RefreshCw,
          label: 'Syncing',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          animate: true,
        };
      case 'FAILED':
        return {
          icon: XCircle,
          label: 'Failed',
          className: 'bg-red-100 text-red-800 border-red-200',
        };
      case 'SYNCED':
        return {
          icon: CheckCircle,
          label: 'Synced',
          className: 'bg-green-100 text-green-800 border-green-200',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${config.className}`}>
      <Icon className={`w-3 h-3 ${config.animate ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
};

// Priority indicator component
const PriorityIndicator: React.FC<{ priority: 'HIGH' | 'NORMAL' | 'LOW' }> = ({ priority }) => {
  if (priority === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
        🚨 High Priority
      </span>
    );
  }
  
  if (priority === 'LOW') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
        📝 Low Priority
      </span>
    );
  }
  
  return null; // Don't show badge for NORMAL priority
};

// Type indicator component
const TypeIndicator: React.FC<{ type: string; data?: any }> = ({ type, data }) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'ASSESSMENT':
        return {
          icon: '📋',
          label: data?.assessmentType ? `${data.assessmentType} Assessment` : 'Assessment',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'RESPONSE':
        return {
          icon: '🚑',
          label: 'Response',
          className: 'bg-green-50 text-green-700 border-green-200',
        };
      case 'MEDIA':
        return {
          icon: '📷',
          label: 'Media File',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'ENTITY':
        return {
          icon: '🏠',
          label: 'Entity',
          className: 'bg-orange-50 text-orange-700 border-orange-200',
        };
      case 'INCIDENT':
        return {
          icon: '⚠️',
          label: 'Incident',
          className: 'bg-red-50 text-red-700 border-red-200',
        };
      default:
        return {
          icon: '📄',
          label: type,
          className: 'bg-gray-50 text-gray-700 border-gray-200',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border ${config.className}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

// Main QueueItem component
export const QueueItem: React.FC<QueueItemProps> = ({
  item,
  onRetry,
  onRemove,
  onViewDetails,
  showActions = true,
  compact = false,
}) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const status = getItemStatus(item);
  
  // Check if this is a health emergency (high priority health assessment)
  const isHealthEmergency = item.type === 'ASSESSMENT' && 
                           item.data?.assessmentType === 'HEALTH' && 
                           item.priority === 'HIGH';

  return (
    <div className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
      isHealthEmergency ? 'border-l-4 border-l-red-500 bg-red-50' : 'border-gray-200'
    } ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header with type and emergency indicator */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <TypeIndicator type={item.type} data={item.data} />
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              {item.action}
            </span>
            {isHealthEmergency && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-red-600 text-white">
                🚨 HEALTH EMERGENCY
              </span>
            )}
          </div>

          {/* Status and priority row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={status} />
            <PriorityIndicator priority={item.priority} />
          </div>

          {/* Timestamps */}
          <div className="text-xs text-gray-500 mb-2">
            <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
            {item.lastAttempt && (
              <span className="ml-3">
                Last attempt: {new Date(item.lastAttempt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Additional details */}
          {!compact && item.data && (
            <div className="text-sm text-gray-600 mb-2">
              {item.type === 'ASSESSMENT' && item.data.assessmentType && (
                <div>Assessment Type: <span className="font-medium">{item.data.assessmentType}</span></div>
              )}
              {item.type === 'MEDIA' && item.data.fileName && (
                <div>File: <span className="font-medium">{item.data.fileName}</span></div>
              )}
              {item.entityId && (
                <div>Entity ID: <span className="font-mono text-xs">{item.entityId}</span></div>
              )}
            </div>
          )}

          {/* Error message */}
          {item.error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error:</p>
                <p>{item.error}</p>
              </div>
            </div>
          )}

          {/* Retry information */}
          {item.retryCount > 0 && (
            <div className={`text-xs p-2 rounded ${
              status === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
            }`}>
              <span className="font-medium">Retry attempts: {item.retryCount}</span>
              {item.retryCount >= 3 && (
                <span className="ml-2 text-red-600">• Maximum retries reached</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              aria-label="Queue item actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActionsMenu && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-20 min-w-[140px]">
                {onViewDetails && (
                  <button
                    onClick={() => {
                      onViewDetails(item);
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye className="w-3 h-3" />
                    View Details
                  </button>
                )}
                
                {status === 'FAILED' && (
                  <button
                    onClick={() => {
                      onRetry(item.id);
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry Now
                  </button>
                )}
                
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to remove this item from the queue?')) {
                      onRemove(item.id);
                    }
                    setShowActionsMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showActionsMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowActionsMenu(false)}
        />
      )}
    </div>
  );
};