import { Incident, UserRole } from '@dms/shared';

export interface NotificationRequest {
  type: 'INCIDENT_CREATED' | 'ASSESSMENT_SUBMITTED' | 'VERIFICATION_REQUIRED';
  title: string;
  message: string;
  targetRoles: UserRole['name'][];
  entityId: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  metadata?: {
    incidentType?: string;
    severity?: string;
    assessorName?: string;
    location?: string;
    affectedPopulation?: number;
  };
}

export interface NotificationResponse {
  success: boolean;
  notificationId?: string;
  notificationsSent?: number;
  notificationsFailed?: number;
  coordinatorsNotified?: Array<{ id: string; name: string }>;
  warnings?: string[];
  error?: string;
  message?: string;
}

export class NotificationService {
  private static readonly BASE_URL = '/api/v1/notifications';

  /**
   * Sends notifications to specific user roles
   */
  static async sendNotification(
    request: NotificationRequest
  ): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to send notification'
      );
    }
  }

  /**
   * Notifies coordinators about a new incident created from preliminary assessment
   */
  static async notifyCoordinatorsOfNewIncident(
    incident: {
      id: string;
      name: string;
      type: string;
      severity: string;
      preliminaryAssessmentIds: string[];
    },
    assessorName: string,
    metadata?: {
      affectedPopulation?: number;
      location?: string;
    }
  ): Promise<NotificationResponse> {
    const priority = incident.severity === 'CATASTROPHIC' || incident.severity === 'SEVERE' 
      ? 'HIGH' 
      : incident.severity === 'MODERATE' 
        ? 'NORMAL' 
        : 'LOW';

    const notification: NotificationRequest = {
      type: 'INCIDENT_CREATED',
      title: `New ${incident.severity} ${incident.type} Incident`,
      message: `A preliminary assessment by ${assessorName} has triggered the creation of a new ${incident.severity.toLowerCase()} ${incident.type.toLowerCase()} incident. Immediate review and response coordination required.`,
      targetRoles: ['COORDINATOR'],
      entityId: incident.id,
      priority,
      metadata: {
        incidentType: incident.type,
        severity: incident.severity,
        assessorName,
        location: metadata?.location,
        affectedPopulation: metadata?.affectedPopulation,
      },
    };

    return this.sendNotification(notification);
  }

  /**
   * Notifies coordinators about high-priority preliminary assessments
   */
  static async notifyCoordinatorsOfHighPriorityAssessment(
    assessmentId: string,
    assessorName: string,
    assessmentData: {
      incidentType: string;
      severity: string;
      affectedPopulationEstimate: number;
      immediateNeedsDescription: string;
    }
  ): Promise<NotificationResponse> {
    const notification: NotificationRequest = {
      type: 'ASSESSMENT_SUBMITTED',
      title: `High Priority Preliminary Assessment`,
      message: `${assessorName} has submitted a high priority preliminary assessment for a ${assessmentData.severity.toLowerCase()} ${assessmentData.incidentType.toLowerCase()} incident affecting ${assessmentData.affectedPopulationEstimate} people. Immediate attention required.`,
      targetRoles: ['COORDINATOR'],
      entityId: assessmentId,
      priority: 'HIGH',
      metadata: {
        incidentType: assessmentData.incidentType,
        severity: assessmentData.severity,
        assessorName,
        affectedPopulation: assessmentData.affectedPopulationEstimate,
      },
    };

    return this.sendNotification(notification);
  }

  /**
   * Creates an in-app notification for offline scenarios
   */
  static async createOfflineNotification(
    request: NotificationRequest
  ): Promise<void> {
    // Store notification for later sending when online
    const offlineNotification = {
      ...request,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };

    try {
      // Store in localStorage for offline scenarios
      const existingNotifications = JSON.parse(
        localStorage.getItem('offline-notifications') || '[]'
      );
      
      existingNotifications.push(offlineNotification);
      localStorage.setItem(
        'offline-notifications', 
        JSON.stringify(existingNotifications)
      );

      // Also show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(request.title, {
          body: request.message,
          icon: '/icons/incident-alert.png',
          tag: `dms-${request.type}-${request.entityId}`,
          requireInteraction: request.priority === 'HIGH',
        });
      }
    } catch (error) {
      console.error('Failed to create offline notification:', error);
    }
  }

  /**
   * Requests notification permission from the user
   */
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * Convenience method for notifying coordinators (expected by tests)
   */
  static async notifyCoordinators(request: {
    incidentId: string;
    assessmentId: string;
    assessorName: string;
    incidentType: string;
    severity: string;
    priorityLevel: string;
    affectedPopulation: number;
    message: string;
  }): Promise<NotificationResponse> {
    const priority = request.severity === 'CATASTROPHIC' || request.severity === 'SEVERE' 
      ? 'HIGH' 
      : request.severity === 'MODERATE' 
        ? 'NORMAL' 
        : 'LOW';

    const notification: NotificationRequest = {
      type: 'INCIDENT_CREATED',
      title: `New ${request.severity} ${request.incidentType} Incident`,
      message: request.message,
      targetRoles: ['COORDINATOR'],
      entityId: request.incidentId,
      priority,
      metadata: {
        incidentType: request.incidentType,
        severity: request.severity,
        assessorName: request.assessorName,
        affectedPopulation: request.affectedPopulation,
      },
    };

    return this.sendNotification(notification);
  }

  /**
   * Syncs offline notifications when connectivity is restored
   */
  static async syncOfflineNotifications(): Promise<void> {
    try {
      const offlineNotifications = JSON.parse(
        localStorage.getItem('offline-notifications') || '[]'
      );

      if (offlineNotifications.length === 0) return;

      const promises = offlineNotifications.map(async (notification: any) => {
        try {
          await this.sendNotification(notification);
          return notification.id;
        } catch (error) {
          console.error(`Failed to sync notification ${notification.id}:`, error);
          return null;
        }
      });

      const syncedIds = (await Promise.all(promises)).filter(Boolean);

      // Remove successfully synced notifications
      const remainingNotifications = offlineNotifications.filter(
        (notification: any) => !syncedIds.includes(notification.id)
      );

      localStorage.setItem(
        'offline-notifications',
        JSON.stringify(remainingNotifications)
      );

      console.log(`Synced ${syncedIds.length} offline notifications`);
    } catch (error) {
      console.error('Failed to sync offline notifications:', error);
    }
  }
}