/**
 * OptimisticToast - Toast notifications for optimistic updates
 * 
 * Provides user-friendly notifications for sync success/failure states
 * with retry options and clear messaging.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/sync.store';
import { cn } from '@/lib/utils/cn';
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  X,
  RotateCcw,
  Clock
} from 'lucide-react';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // Auto-dismiss time in ms
  persistent?: boolean; // Don't auto-dismiss
  actions?: {
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }[];
  updateId?: string; // Link to optimistic update
}

export interface OptimisticToastProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxNotifications?: number;
  className?: string;
}

export const OptimisticToast: React.FC<OptimisticToastProps> = ({
  position = 'top-right',
  maxNotifications = 5,
  className,
}) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const {
    optimisticUpdates,
    retryOptimisticUpdate,
    rollbackOptimisticUpdate,
    rollbackInProgress,
  } = useSyncStore();

  // Monitor optimistic updates and create notifications
  useEffect(() => {
    const handleOptimisticUpdates = () => {
      const updates = Array.from(optimisticUpdates.values());
      const newNotifications: ToastNotification[] = [];

      updates.forEach(update => {
        // Check if we already have a notification for this update
        const existingNotification = notifications.find(n => n.updateId === update.id);
        
        if (update.status === 'CONFIRMED' && !existingNotification) {
          newNotifications.push({
            id: `success-${update.id}`,
            type: 'success',
            title: 'Changes saved',
            message: `${getEntityLabel(update.entityType)} ${getOperationLabel(update.operation)} successfully`,
            duration: 3000,
            updateId: update.id,
          });
        } else if (update.status === 'FAILED' && !existingNotification) {
          newNotifications.push({
            id: `error-${update.id}`,
            type: 'error',
            title: 'Sync failed',
            message: update.error || `Failed to ${getOperationLabel(update.operation)} ${getEntityLabel(update.entityType)}`,
            persistent: true,
            updateId: update.id,
            actions: [
              {
                label: 'Retry',
                action: () => handleRetryUpdate(update.id),
                variant: 'primary',
              },
              {
                label: 'Rollback',
                action: () => handleRollbackUpdate(update.id),
                variant: 'secondary',
              },
            ],
          });
        } else if (update.status === 'ROLLED_BACK' && !existingNotification) {
          newNotifications.push({
            id: `rollback-${update.id}`,
            type: 'warning',
            title: 'Changes rolled back',
            message: `${getEntityLabel(update.entityType)} changes have been reverted`,
            duration: 4000,
            updateId: update.id,
          });
        }
      });

      if (newNotifications.length > 0) {
        setNotifications(prev => {
          const updated = [...prev, ...newNotifications];
          // Limit number of notifications
          return updated.slice(-maxNotifications);
        });
      }
    };

    handleOptimisticUpdates();
  }, [optimisticUpdates, maxNotifications]);

  // Auto-dismiss notifications
  useEffect(() => {
    const timers: Record<string, NodeJS.Timeout> = {};

    notifications.forEach(notification => {
      if (!notification.persistent && notification.duration && !timers[notification.id]) {
        timers[notification.id] = setTimeout(() => {
          dismissNotification(notification.id);
        }, notification.duration);
      }
    });

    return () => {
      Object.values(timers).forEach(timer => clearTimeout(timer));
    };
  }, [notifications]);

  const getEntityLabel = (entityType: string): string => {
    switch (entityType) {
      case 'ASSESSMENT': return 'assessment';
      case 'RESPONSE': return 'response';
      case 'INCIDENT': return 'incident';
      case 'ENTITY': return 'item';
      default: return 'item';
    }
  };

  const getOperationLabel = (operation: string): string => {
    switch (operation) {
      case 'CREATE': return 'created';
      case 'UPDATE': return 'updated';
      case 'DELETE': return 'deleted';
      default: return 'modified';
    }
  };

  const handleRetryUpdate = async (updateId: string) => {
    try {
      await retryOptimisticUpdate(updateId);
      // Remove error notification
      setNotifications(prev => prev.filter(n => n.updateId !== updateId));
      
      // Add retry notification
      addNotification({
        id: `retry-${updateId}`,
        type: 'info',
        title: 'Retrying sync',
        message: 'Attempting to sync changes again...',
        duration: 3000,
        updateId,
      });
    } catch (error) {
      console.error('Failed to retry update:', error);
    }
  };

  const handleRollbackUpdate = async (updateId: string) => {
    try {
      await rollbackOptimisticUpdate(updateId);
      // Remove error notification
      setNotifications(prev => prev.filter(n => n.updateId !== updateId));
    } catch (error) {
      console.error('Failed to rollback update:', error);
    }
  };

  const addNotification = (notification: ToastNotification) => {
    setNotifications(prev => [...prev, notification].slice(-maxNotifications));
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getToastStyles = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-500',
          textColor: 'text-green-800',
          icon: <CheckCircle2 className="w-5 h-5" />,
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
          textColor: 'text-red-800',
          icon: <AlertCircle className="w-5 h-5" />,
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-500',
          textColor: 'text-yellow-800',
          icon: <RotateCcw className="w-5 h-5" />,
        };
      case 'info':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          textColor: 'text-blue-800',
          icon: <Clock className="w-5 h-5" />,
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-500',
          textColor: 'text-gray-800',
          icon: <AlertCircle className="w-5 h-5" />,
        };
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'fixed z-50 space-y-2 max-w-sm w-full',
      getPositionClasses(),
      className
    )}>
      {notifications.map(notification => {
        const styles = getToastStyles(notification.type);
        
        return (
          <div
            key={notification.id}
            className={cn(
              'p-4 rounded-lg border shadow-lg transform transition-all duration-300 ease-in-out',
              styles.bgColor,
              styles.borderColor,
              'animate-slide-in'
            )}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className={styles.iconColor}>
                {styles.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={cn('text-sm font-medium', styles.textColor)}>
                  {notification.title}
                </h4>
                <p className={cn('text-sm mt-1', styles.textColor.replace('800', '700'))}>
                  {notification.message}
                </p>
                
                {/* Actions */}
                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex items-center space-x-2 mt-3">
                    {notification.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={action.action}
                        disabled={rollbackInProgress}
                        className={cn(
                          'text-xs font-medium px-2 py-1 rounded transition-colors disabled:opacity-50',
                          action.variant === 'primary'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Dismiss Button */}
              <button
                onClick={() => dismissNotification(notification.id)}
                className="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OptimisticToast;