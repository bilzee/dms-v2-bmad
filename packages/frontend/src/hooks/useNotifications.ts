import { useEffect, useRef } from 'react';
import { useSyncStore } from '@/stores/sync.store';
import { useOfflineStore } from '@/stores/offline.store';
import { notificationService } from '@/lib/services/notification.service';
import type { OfflineQueueItem } from '@dms/shared';

// Hook to manage sync-related notifications
export function useNotifications() {
  const { queue, error } = useSyncStore();
  const { isOnline } = useOfflineStore();
  
  // Track previous state to detect changes
  const prevQueueRef = useRef<OfflineQueueItem[]>([]);
  const prevOnlineRef = useRef<boolean>(true);
  const prevErrorRef = useRef<string | null>(null);

  // Monitor queue changes for sync failures
  useEffect(() => {
    const prevQueue = prevQueueRef.current;
    const currentQueue = queue;

    // Detect newly failed items
    const newFailures: OfflineQueueItem[] = [];
    const retriedSuccesses: OfflineQueueItem[] = [];

    currentQueue.forEach(currentItem => {
      const prevItem = prevQueue.find(p => p.id === currentItem.id);
      
      // New failure: item now has error but didn't before
      if (currentItem.error && (!prevItem || !prevItem.error)) {
        newFailures.push(currentItem);
      }
      
      // Retry success: item had error before but doesn't now, and retry count increased
      if (!currentItem.error && prevItem?.error && currentItem.retryCount > (prevItem.retryCount || 0)) {
        retriedSuccesses.push(currentItem);
      }
    });

    // Show notifications for new failures
    if (newFailures.length > 0) {
      if (newFailures.length === 1) {
        // Single failure
        notificationService.showSyncFailure(newFailures[0]);
      } else {
        // Multiple failures - show batch notification
        notificationService.showBatchSyncFailures(newFailures);
      }
    }

    // Show notifications for retry successes
    retriedSuccesses.forEach(item => {
      notificationService.showRetrySuccess(item);
    });

    // Update ref for next comparison
    prevQueueRef.current = [...currentQueue];
  }, [queue]);

  // Monitor online/offline status
  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    const nowOnline = isOnline;

    if (!wasOnline && nowOnline) {
      // Went from offline to online
      notificationService.showSyncResumed();
    } else if (wasOnline && !nowOnline) {
      // Went from online to offline
      notificationService.showOfflineMode();
    }

    prevOnlineRef.current = nowOnline;
  }, [isOnline]);

  // Monitor sync store errors
  useEffect(() => {
    const prevError = prevErrorRef.current;
    const currentError = error;

    // Show error notification if there's a new error
    if (currentError && currentError !== prevError) {
      // Only show for critical errors, not for individual item failures
      if (currentError.includes('Failed to load queue') || 
          currentError.includes('Failed to refresh') ||
          currentError.includes('Network')) {
        notificationService.showSyncFailure({
          id: 'sync-store-error',
          type: 'ASSESSMENT',
          action: 'CREATE',
          data: {},
          retryCount: 0,
          priority: 'HIGH',
          createdAt: new Date(),
          error: currentError,
        });
      }
    }

    prevErrorRef.current = currentError;
  }, [error]);

  // Return notification service methods for manual use
  return {
    showSyncFailure: notificationService.showSyncFailure.bind(notificationService),
    showRetrySuccess: notificationService.showRetrySuccess.bind(notificationService),
    showAutoRetryAttempt: notificationService.showAutoRetryAttempt.bind(notificationService),
    showQueueCleared: notificationService.showQueueCleared.bind(notificationService),
    dismissNotification: notificationService.dismissNotification.bind(notificationService),
    dismissAllSyncNotifications: notificationService.dismissAllSyncNotifications.bind(notificationService),
    updateSettings: notificationService.updateSettings.bind(notificationService),
    getSettings: notificationService.getSettings.bind(notificationService),
  };
}

// Hook for notification settings management
export function useNotificationSettings() {
  const settings = notificationService.getSettings();

  const updateSettings = (newSettings: Parameters<typeof notificationService.updateSettings>[0]) => {
    notificationService.updateSettings(newSettings);
  };

  return {
    settings,
    updateSettings,
  };
}