// Push notification service for mobile and web notifications
export interface PushNotificationData {
  recipients: Array<{
    userId: string;
    deviceTokens?: string[];
    roles: string[];
  }>;
  title: string;
  body: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
}

export interface User {
  id: string;
  roles: Array<{ name: string }>;
}

export class PushNotificationService {
  private static instance: PushNotificationService;

  private constructor() {}

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async sendImmediate(users: User[], notification: any): Promise<boolean> {
    try {
      const pushData: PushNotificationData = {
        recipients: users.map(user => ({
          userId: user.id,
          roles: user.roles.map(role => role.name),
        })),
        title: notification.title,
        body: notification.message,
        priority: notification.priority,
        data: notification.metadata,
        sound: notification.priority === 'HIGH' ? 'emergency.caf' : 'default',
      };

      console.log('Sending immediate push notifications:', {
        recipientCount: pushData.recipients.length,
        title: pushData.title,
        priority: pushData.priority,
      });

      // In a real implementation, this would integrate with:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNS)
      // - Web Push Protocol
      // - OneSignal or similar service

      // Simulate push notification sending
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const results = await this.sendBatchNotifications([pushData]);
      
      return results.sent > 0;
    } catch (error) {
      console.error('Push notification service error:', error);
      return false;
    }
  }

  async sendNotification(data: PushNotificationData): Promise<boolean> {
    try {
      // Simulate different delivery methods based on priority
      if (data.priority === 'HIGH') {
        // High priority: immediate delivery with retry
        return await this.sendHighPriorityNotification(data);
      } else {
        // Normal/Low priority: batch processing
        return await this.sendRegularNotification(data);
      }
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  async sendBatchNotifications(notifications: PushNotificationData[]): Promise<{
    sent: number;
    failed: number;
    results: Array<{ success: boolean; error?: string }>;
  }> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - sent;

    return {
      sent,
      failed,
      results: results.map(r => ({
        success: r.status === 'fulfilled' && r.value,
        error: r.status === 'rejected' ? String(r.reason) : undefined,
      })),
    };
  }

  private async sendHighPriorityNotification(data: PushNotificationData): Promise<boolean> {
    // Simulate high-priority push with better delivery guarantees
    await new Promise(resolve => setTimeout(resolve, 25));
    return Math.random() < 0.98; // 98% success rate for high priority
  }

  private async sendRegularNotification(data: PushNotificationData): Promise<boolean> {
    // Simulate regular push notifications
    await new Promise(resolve => setTimeout(resolve, 75));
    return Math.random() < 0.92; // 92% success rate for regular priority
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();