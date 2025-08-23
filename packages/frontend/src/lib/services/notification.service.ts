import toast from 'react-hot-toast';
import type { OfflineQueueItem } from '@dms/shared';

interface NotificationSettings {
  enableSyncFailureNotifications: boolean;
  enableHealthEmergencyAlerts: boolean;
  enableBatchNotifications: boolean;
  maxNotificationsPerMinute: number;
  autoRetryNotifications: boolean;
}

class NotificationService {
  private settings: NotificationSettings = {
    enableSyncFailureNotifications: true,
    enableHealthEmergencyAlerts: true, 
    enableBatchNotifications: true,
    maxNotificationsPerMinute: 5,
    autoRetryNotifications: true,
  };

  private notificationHistory: Array<{ timestamp: Date; type: string }> = [];
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute

  // Load settings from localStorage or use defaults
  constructor() {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('dms-notification-settings');
      if (savedSettings) {
        try {
          this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        } catch (error) {
          console.warn('Failed to load notification settings:', error);
        }
      }
    }
  }

  // Update notification settings
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== 'undefined') {
      localStorage.setItem('dms-notification-settings', JSON.stringify(this.settings));
    }
  }

  // Get current settings
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Check if we're within rate limits
  private canNotify(type: string): boolean {
    const now = new Date();
    const recentNotifications = this.notificationHistory.filter(
      n => n.type === type && (now.getTime() - n.timestamp.getTime()) < this.RATE_LIMIT_WINDOW
    );

    return recentNotifications.length < this.settings.maxNotificationsPerMinute;
  }

  // Add to notification history
  private recordNotification(type: string): void {
    this.notificationHistory.push({ timestamp: new Date(), type });
    
    // Clean up old entries (keep only last hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.notificationHistory = this.notificationHistory.filter(
      n => n.timestamp > oneHourAgo
    );
  }

  // Show sync failure notification for individual item
  showSyncFailure(queueItem: OfflineQueueItem): void {
    if (!this.settings.enableSyncFailureNotifications || !this.canNotify('sync-failure')) {
      return;
    }

    const isHealthEmergency = queueItem.type === 'ASSESSMENT' && 
                             queueItem.data?.assessmentType === 'HEALTH' && 
                             queueItem.priority === 'HIGH';

    const title = isHealthEmergency ? '🚨 Health Emergency Sync Failed' : '⚠️ Sync Failed';
    const message = this.formatSyncFailureMessage(queueItem);

    // Health emergencies get error-level notifications, others get warning
    if (isHealthEmergency && this.settings.enableHealthEmergencyAlerts) {
      toast.error(message, {
        id: `sync-failure-${queueItem.id}`,
        duration: 8000, // Longer duration for critical alerts
        icon: '🚨',
        style: {
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
        },
      });
    } else {
      toast(message, {
        id: `sync-failure-${queueItem.id}`,
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#fffbeb',
          border: '1px solid #fed7aa',
          color: '#92400e',
        },
      });
    }

    this.recordNotification('sync-failure');
  }

  // Show batch sync failure notification
  showBatchSyncFailures(failedItems: OfflineQueueItem[]): void {
    if (!this.settings.enableBatchNotifications || !this.canNotify('batch-failure')) {
      return;
    }

    const healthEmergencies = failedItems.filter(
      item => item.type === 'ASSESSMENT' && 
              item.data?.assessmentType === 'HEALTH' && 
              item.priority === 'HIGH'
    );

    const regularFailures = failedItems.length - healthEmergencies.length;

    let message = `${failedItems.length} items failed to sync`;
    if (healthEmergencies.length > 0) {
      message = `🚨 ${healthEmergencies.length} health emergency${healthEmergencies.length > 1 ? 'ies' : ''} and ${regularFailures} other items failed to sync`;
    }

    toast.error(message, {
      id: 'batch-sync-failure',
      duration: 10000,
      icon: healthEmergencies.length > 0 ? '🚨' : '⚠️',
      style: {
        background: healthEmergencies.length > 0 ? '#fef2f2' : '#fffbeb',
        border: `1px solid ${healthEmergencies.length > 0 ? '#fecaca' : '#fed7aa'}`,
        color: healthEmergencies.length > 0 ? '#991b1b' : '#92400e',
      },
    });

    this.recordNotification('batch-failure');
  }

  // Show retry success notification
  showRetrySuccess(queueItem: OfflineQueueItem): void {
    if (!this.canNotify('retry-success')) {
      return;
    }

    const itemType = this.getItemTypeDisplay(queueItem);
    const message = `✅ ${itemType} sync retry successful`;

    toast.success(message, {
      id: `retry-success-${queueItem.id}`,
      duration: 3000,
      icon: '✅',
    });

    this.recordNotification('retry-success');
  }

  // Show auto-retry notification
  showAutoRetryAttempt(queueItem: OfflineQueueItem, retryCount: number, nextRetryIn: number): void {
    if (!this.settings.autoRetryNotifications || !this.canNotify('auto-retry')) {
      return;
    }

    const itemType = this.getItemTypeDisplay(queueItem);
    const nextRetryMinutes = Math.ceil(nextRetryIn / 60000);
    const message = `🔄 ${itemType} auto-retry ${retryCount}/10. Next attempt in ${nextRetryMinutes}m`;

    toast(message, {
      id: `auto-retry-${queueItem.id}`,
      duration: 4000,
      icon: '🔄',
      style: {
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        color: '#0369a1',
      },
    });

    this.recordNotification('auto-retry');
  }

  // Show sync resumed notification
  showSyncResumed(): void {
    if (!this.canNotify('sync-resumed')) {
      return;
    }

    toast.success('🌐 Connection restored - sync resumed', {
      id: 'sync-resumed',
      duration: 4000,
      icon: '🌐',
    });

    this.recordNotification('sync-resumed');
  }

  // Show offline mode notification
  showOfflineMode(): void {
    if (!this.canNotify('offline-mode')) {
      return;
    }

    toast('📴 Operating in offline mode', {
      id: 'offline-mode',
      duration: 5000,
      icon: '📴',
      style: {
        background: '#f9fafb',
        border: '1px solid #d1d5db',
        color: '#374151',
      },
    });

    this.recordNotification('offline-mode');
  }

  // Show queue cleared notification
  showQueueCleared(clearedCount: number): void {
    if (!this.canNotify('queue-cleared')) {
      return;
    }

    toast.success(`🧹 ${clearedCount} completed items removed from queue`, {
      id: 'queue-cleared',
      duration: 3000,
      icon: '🧹',
    });

    this.recordNotification('queue-cleared');
  }

  // Dismiss specific notification
  dismissNotification(queueItemId: string): void {
    toast.dismiss(`sync-failure-${queueItemId}`);
    toast.dismiss(`retry-success-${queueItemId}`);
    toast.dismiss(`auto-retry-${queueItemId}`);
  }

  // Dismiss all sync-related notifications
  dismissAllSyncNotifications(): void {
    // React-hot-toast doesn't have a way to dismiss by pattern, 
    // so we'll dismiss the common ones
    toast.dismiss('batch-sync-failure');
    toast.dismiss('sync-resumed');
    toast.dismiss('offline-mode');
    toast.dismiss('queue-cleared');
  }

  // Format sync failure message
  private formatSyncFailureMessage(queueItem: OfflineQueueItem): string {
    const itemType = this.getItemTypeDisplay(queueItem);
    const error = queueItem.error || 'Unknown error';
    
    // Simplify common errors for user-friendly display
    const friendlyError = this.getFriendlyErrorMessage(error);
    
    return `${itemType} failed to sync: ${friendlyError}`;
  }

  // Get user-friendly item type display
  private getItemTypeDisplay(queueItem: OfflineQueueItem): string {
    switch (queueItem.type) {
      case 'ASSESSMENT':
        return queueItem.data?.assessmentType ? 
          `${queueItem.data.assessmentType} Assessment` : 
          'Assessment';
      case 'RESPONSE':
        return 'Response';
      case 'MEDIA':
        return 'Media file';
      case 'ENTITY':
        return 'Entity';
      case 'INCIDENT':
        return 'Incident';
      default:
        return queueItem.type;
    }
  }

  // Convert technical errors to user-friendly messages
  private getFriendlyErrorMessage(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('network') || errorLower.includes('fetch')) {
      return 'Network connection error';
    }
    if (errorLower.includes('timeout')) {
      return 'Request timed out';
    }
    if (errorLower.includes('unauthorized') || errorLower.includes('401')) {
      return 'Authentication expired';
    }
    if (errorLower.includes('forbidden') || errorLower.includes('403')) {
      return 'Access denied';
    }
    if (errorLower.includes('validation') || errorLower.includes('400')) {
      return 'Data validation failed';
    }
    if (errorLower.includes('server') || errorLower.includes('500')) {
      return 'Server error';
    }
    if (errorLower.includes('conflict') || errorLower.includes('409')) {
      return 'Data conflict detected';
    }
    
    // Return first 50 characters of original error if no pattern matches
    return error.length > 50 ? `${error.substring(0, 50)}...` : error;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export type { NotificationSettings };