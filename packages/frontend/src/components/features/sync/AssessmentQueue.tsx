'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Clock, CheckCircle, XCircle, Filter, MoreVertical } from 'lucide-react';
import { useSyncStore } from '@/stores/sync.store';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationSettingsButton, NotificationSettingsModal } from './NotificationSettings';
import type { OfflineQueueItem } from '@dms/shared';

interface AssessmentQueueProps {
  className?: string;
  items?: OfflineQueueItem[];
  isLoading?: boolean;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  onFilterChange?: (filters: any) => void;
  currentFilters?: any;
}

// Status badge component with color coding
const StatusBadge: React.FC<{ 
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';
  className?: string;
}> = ({ status, className = '' }) => {
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
          className: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
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
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${config.className} ${className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Priority badge component
const PriorityBadge: React.FC<{ 
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  className?: string;
}> = ({ priority, className = '' }) => {
  const getPriorityConfig = () => {
    switch (priority) {
      case 'HIGH':
        return {
          label: 'High Priority',
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: '🚨',
        };
      case 'NORMAL':
        return {
          label: 'Normal',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '📋',
        };
      case 'LOW':
        return {
          label: 'Low Priority',
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: '📝',
        };
    }
  };

  const config = getPriorityConfig();

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${config.className} ${className}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

// Individual queue item component
const QueueItem: React.FC<{
  item: OfflineQueueItem;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ item, onRetry, onRemove }) => {
  const [showActions, setShowActions] = useState(false);
  
  // Determine status based on error and retry count
  const getStatus = (): 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED' => {
    if (item.error && item.retryCount > 0) return 'FAILED';
    if (!item.error && item.retryCount === 0) return 'PENDING';
    if (!item.error && item.retryCount > 0) return 'SYNCING';
    return 'PENDING';
  };

  const status = getStatus();
  const isHealthAssessment = item.type === 'ASSESSMENT' && item.data?.assessmentType === 'HEALTH';

  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
      isHealthAssessment ? 'border-l-4 border-l-red-500' : ''
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header with type and priority */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {item.type} - {item.action}
            </h3>
            <PriorityBadge priority={item.priority} />
            {isHealthAssessment && (
              <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full font-medium">
                Health Emergency
              </span>
            )}
          </div>

          {/* Status and details */}
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={status} />
            <span className="text-xs text-gray-500">
              Created: {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>

          {/* Assessment type for assessment items */}
          {item.type === 'ASSESSMENT' && item.data?.assessmentType && (
            <div className="text-sm text-gray-600 mb-2">
              Assessment Type: <span className="font-medium">{item.data.assessmentType}</span>
            </div>
          )}

          {/* Error message */}
          {item.error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{item.error}</span>
            </div>
          )}

          {/* Retry information */}
          {item.retryCount > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Retry attempts: {item.retryCount}
              {item.lastAttempt && (
                <> • Last attempt: {new Date(item.lastAttempt).toLocaleString()}</>
              )}
            </div>
          )}
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Queue item actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showActions && (
            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-10 min-w-[120px]">
              {status === 'FAILED' && (
                <button
                  onClick={() => {
                    onRetry(item.id);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              )}
              <button
                onClick={() => {
                  onRemove(item.id);
                  setShowActions(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <XCircle className="w-3 h-3" />
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main AssessmentQueue component
export const AssessmentQueue: React.FC<AssessmentQueueProps> = ({ 
  className = '',
  items,
  isLoading: propIsLoading,
  onRetry,
  onRemove,
  onFilterChange,
  currentFilters: propCurrentFilters
}) => {
  const {
    filteredQueue: storeFilteredQueue,
    currentFilters: storeCurrentFilters,
    isLoading: storeIsLoading,
    isRefreshing,
    error,
    loadQueue,
    refreshQueue,
    retryQueueItem,
    removeQueueItem,
    updateFilters,
    clearError,
  } = useSyncStore();

  // Use props if provided, otherwise fall back to store
  const filteredQueue = items || storeFilteredQueue;
  const currentFilters = propCurrentFilters || storeCurrentFilters;
  const isLoading = propIsLoading !== undefined ? propIsLoading : storeIsLoading;

  const [showFilters, setShowFilters] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  
  // Initialize notifications
  useNotifications();

  // Load queue on component mount
  useEffect(() => {
    loadQueue(currentFilters);
  }, []);

  // Handle retry
  const handleRetry = async (id: string) => {
    if (onRetry) {
      onRetry(id);
    } else {
      await retryQueueItem(id);
    }
  };

  // Handle remove
  const handleRemove = async (id: string) => {
    if (confirm('Are you sure you want to remove this item from the queue?')) {
      if (onRemove) {
        onRemove(id);
      } else {
        await removeQueueItem(id);
      }
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      ...currentFilters,
      [key]: value || undefined,
    };
    
    if (onFilterChange) {
      onFilterChange(newFilters);
    } else {
      updateFilters(newFilters);
    }
  };

  // Get health emergency items count
  const healthEmergencyCount = filteredQueue.filter(
    item => item.type === 'ASSESSMENT' && 
           item.data?.assessmentType === 'HEALTH' && 
           item.priority === 'HIGH'
  ).length;

  return (
    <div className={`bg-gray-50 rounded-lg ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assessment Queue</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredQueue.length} items • {healthEmergencyCount} health emergencies
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                showFilters 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            <NotificationSettingsButton 
              onClick={() => setShowNotificationSettings(true)}
            />
            
            <button
              onClick={refreshQueue}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={currentFilters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="SYNCING">Syncing</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={currentFilters.priority || ''}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="HIGH">High Priority</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={currentFilters.type || ''}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="ASSESSMENT">Assessment</option>
                  <option value="RESPONSE">Response</option>
                  <option value="MEDIA">Media</option>
                  <option value="ENTITY">Entity</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Loading queue...</p>
        </div>
      )}

      {/* Queue items */}
      {!isLoading && (
        <div className="p-6">
          {filteredQueue.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">Queue is empty</h3>
              <p className="text-sm text-gray-500">All assessments are up to date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQueue.map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  onRetry={handleRetry}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
    </div>
  );
};