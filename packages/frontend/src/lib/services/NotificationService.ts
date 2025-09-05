import DatabaseService from './DatabaseService';
import { AdminUser, AdminRole, RoleHistory } from '../../../../shared/types/admin';

export interface RoleChangeNotification {
  type: 'ROLE_ASSIGNED' | 'ROLE_REMOVED' | 'ROLE_ACTIVATED' | 'BULK_ASSIGNMENT';
  userId: string;
  userName: string;
  userEmail: string;
  adminId: string;
  adminName: string;
  roles: AdminRole[];
  reason?: string;
  timestamp: Date;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class NotificationService {
  // Generate role change notification
  static async createRoleChangeNotification(
    type: RoleChangeNotification['type'],
    user: AdminUser,
    admin: { id: string; name: string },
    roles: AdminRole[],
    reason?: string
  ): Promise<RoleChangeNotification> {
    return {
      type,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      adminId: admin.id,
      adminName: admin.name,
      roles,
      reason,
      timestamp: new Date()
    };
  }

  // Send role assignment notification
  static async sendRoleAssignmentNotification(
    user: AdminUser,
    assignedRoles: AdminRole[],
    removedRoles: AdminRole[],
    admin: { id: string; name: string },
    reason?: string
  ): Promise<void> {
    try {
      // Create notification for assigned roles
      if (assignedRoles.length > 0) {
        const notification = await this.createRoleChangeNotification(
          'ROLE_ASSIGNED',
          user,
          admin,
          assignedRoles,
          reason
        );

        await this.storeNotification(notification);
        
        // Send email if configured
        if (process.env.SEND_EMAIL_NOTIFICATIONS === 'true') {
          await this.sendEmailNotification(notification);
        }

        // Send in-app notification
        await this.sendInAppNotification(notification);
      }

      // Create notification for removed roles
      if (removedRoles.length > 0) {
        const notification = await this.createRoleChangeNotification(
          'ROLE_REMOVED',
          user,
          admin,
          removedRoles,
          reason
        );

        await this.storeNotification(notification);
        
        if (process.env.SEND_EMAIL_NOTIFICATIONS === 'true') {
          await this.sendEmailNotification(notification);
        }

        await this.sendInAppNotification(notification);
      }
    } catch (error) {
      console.error('Failed to send role assignment notification:', error);
      // Don't throw - notifications should not block role assignment
    }
  }

  // Send bulk assignment notification
  static async sendBulkAssignmentNotification(
    users: AdminUser[],
    roles: AdminRole[],
    admin: { id: string; name: string },
    reason?: string
  ): Promise<void> {
    try {
      // Send individual notifications to each user
      for (const user of users) {
        const notification = await this.createRoleChangeNotification(
          'BULK_ASSIGNMENT',
          user,
          admin,
          roles,
          reason
        );

        await this.storeNotification(notification);
        
        if (process.env.SEND_EMAIL_NOTIFICATIONS === 'true') {
          await this.sendEmailNotification(notification);
        }

        await this.sendInAppNotification(notification);
      }

      // Send summary notification to admin
      await this.sendAdminSummaryNotification(users, roles, admin, reason);
    } catch (error) {
      console.error('Failed to send bulk assignment notifications:', error);
    }
  }

  // Store notification in database
  private static async storeNotification(notification: RoleChangeNotification): Promise<void> {
    const notificationData = {
      type: notification.type,
      title: this.getNotificationTitle(notification),
      message: this.getNotificationMessage(notification),
      targetRoles: ['USER'], // Notify the user
      entityId: notification.userId,
      priority: this.getNotificationPriority(notification.type),
      metadata: {
        adminId: notification.adminId,
        adminName: notification.adminName,
        roles: notification.roles.map(r => ({ id: r.id, name: r.name })),
        reason: notification.reason,
        type: notification.type
      }
    };

    // Store in database using Prisma
    try {
      await DatabaseService.createNotification({
        ...notificationData,
        createdAt: notification.timestamp
      });
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  // Send email notification
  private static async sendEmailNotification(notification: RoleChangeNotification): Promise<void> {
    const template = this.getEmailTemplate(notification);
    
    // TODO: Implement email service integration
    // This would typically integrate with services like SendGrid, SES, etc.
    console.log(`Email notification (${notification.type}):`, {
      to: notification.userEmail,
      subject: template.subject,
      body: template.body,
      priority: template.priority
    });

    // For now, just log the notification
    // In production, you would use your email service here:
    /*
    await emailService.send({
      to: notification.userEmail,
      subject: template.subject,
      html: template.body,
      priority: template.priority
    });
    */
  }

  // Send in-app notification
  private static async sendInAppNotification(notification: RoleChangeNotification): Promise<void> {
    // TODO: Implement WebSocket or Server-Sent Events for real-time notifications
    // This would push notifications to connected clients
    console.log(`In-app notification (${notification.type}):`, {
      userId: notification.userId,
      title: this.getNotificationTitle(notification),
      message: this.getNotificationMessage(notification),
      timestamp: notification.timestamp
    });

    // In production, you would use WebSocket/SSE here:
    /*
    await webSocketService.sendToUser(notification.userId, {
      type: 'ROLE_CHANGE_NOTIFICATION',
      data: {
        title: this.getNotificationTitle(notification),
        message: this.getNotificationMessage(notification),
        timestamp: notification.timestamp
      }
    });
    */
  }

  // Send summary notification to admin
  private static async sendAdminSummaryNotification(
    users: AdminUser[],
    roles: AdminRole[],
    admin: { id: string; name: string },
    reason?: string
  ): Promise<void> {
    const summaryNotification = {
      type: 'BULK_ASSIGNMENT' as const,
      title: `Bulk Role Assignment Completed`,
      message: `Successfully assigned ${roles.length} role(s) to ${users.length} user(s)`,
      targetRoles: ['ADMIN'],
      entityId: admin.id,
      priority: 'MEDIUM' as const,
      metadata: {
        userCount: users.length,
        roleCount: roles.length,
        roles: roles.map(r => r.name),
        reason,
        completedBy: admin.name
      }
    };

    try {
      await DatabaseService.createNotification({
        ...summaryNotification,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Failed to store admin summary notification:', error);
    }
  }

  // Get notification templates
  private static getEmailTemplate(notification: RoleChangeNotification): NotificationTemplate {
    const roleNames = notification.roles.map(r => r.name).join(', ');
    
    switch (notification.type) {
      case 'ROLE_ASSIGNED':
        return {
          subject: `New Role(s) Assigned: ${roleNames}`,
          body: `
            <h2>Role Assignment Notification</h2>
            <p>Hello ${notification.userName},</p>
            <p>You have been assigned the following role(s) in the Disaster Management System:</p>
            <ul>
              ${notification.roles.map(role => `<li><strong>${role.name}</strong>: ${role.description}</li>`).join('')}
            </ul>
            <p><strong>Assigned by:</strong> ${notification.adminName}</p>
            ${notification.reason ? `<p><strong>Reason:</strong> ${notification.reason}</p>` : ''}
            <p><strong>Date:</strong> ${notification.timestamp.toLocaleString()}</p>
            <p>You can now access the features and permissions associated with these roles.</p>
            <p>If you have any questions, please contact your system administrator.</p>
          `,
          priority: 'MEDIUM'
        };

      case 'ROLE_REMOVED':
        return {
          subject: `Role(s) Removed: ${roleNames}`,
          body: `
            <h2>Role Removal Notification</h2>
            <p>Hello ${notification.userName},</p>
            <p>The following role(s) have been removed from your account in the Disaster Management System:</p>
            <ul>
              ${notification.roles.map(role => `<li><strong>${role.name}</strong></li>`).join('')}
            </ul>
            <p><strong>Removed by:</strong> ${notification.adminName}</p>
            ${notification.reason ? `<p><strong>Reason:</strong> ${notification.reason}</p>` : ''}
            <p><strong>Date:</strong> ${notification.timestamp.toLocaleString()}</p>
            <p>Your access to features associated with these roles has been revoked.</p>
            <p>If you believe this is an error, please contact your system administrator.</p>
          `,
          priority: 'HIGH'
        };

      case 'BULK_ASSIGNMENT':
        return {
          subject: `Role Assignment Update: ${roleNames}`,
          body: `
            <h2>Role Assignment Notification</h2>
            <p>Hello ${notification.userName},</p>
            <p>Your role assignments have been updated as part of a bulk operation:</p>
            <ul>
              ${notification.roles.map(role => `<li><strong>${role.name}</strong>: ${role.description}</li>`).join('')}
            </ul>
            <p><strong>Updated by:</strong> ${notification.adminName}</p>
            ${notification.reason ? `<p><strong>Reason:</strong> ${notification.reason}</p>` : ''}
            <p><strong>Date:</strong> ${notification.timestamp.toLocaleString()}</p>
            <p>Please review your new permissions and contact your administrator if you have questions.</p>
          `,
          priority: 'MEDIUM'
        };

      default:
        return {
          subject: 'Role Change Notification',
          body: `
            <p>Hello ${notification.userName},</p>
            <p>Your role assignments have been updated by ${notification.adminName}.</p>
            <p>Please contact your administrator for more details.</p>
          `,
          priority: 'LOW'
        };
    }
  }

  // Get notification title
  private static getNotificationTitle(notification: RoleChangeNotification): string {
    const roleNames = notification.roles.map(r => r.name).join(', ');
    
    switch (notification.type) {
      case 'ROLE_ASSIGNED':
        return `New Role(s) Assigned: ${roleNames}`;
      case 'ROLE_REMOVED':
        return `Role(s) Removed: ${roleNames}`;
      case 'ROLE_ACTIVATED':
        return `Active Role Changed: ${roleNames}`;
      case 'BULK_ASSIGNMENT':
        return `Role Assignment Update: ${roleNames}`;
      default:
        return 'Role Change Notification';
    }
  }

  // Get notification message
  private static getNotificationMessage(notification: RoleChangeNotification): string {
    const roleNames = notification.roles.map(r => r.name).join(', ');
    
    switch (notification.type) {
      case 'ROLE_ASSIGNED':
        return `You have been assigned the following role(s): ${roleNames} by ${notification.adminName}`;
      case 'ROLE_REMOVED':
        return `The following role(s) have been removed from your account: ${roleNames} by ${notification.adminName}`;
      case 'ROLE_ACTIVATED':
        return `Your active role has been changed to: ${roleNames}`;
      case 'BULK_ASSIGNMENT':
        return `Your role assignments have been updated: ${roleNames} by ${notification.adminName}`;
      default:
        return `Your role assignments have been updated by ${notification.adminName}`;
    }
  }

  // Get notification priority
  private static getNotificationPriority(type: RoleChangeNotification['type']): string {
    switch (type) {
      case 'ROLE_ASSIGNED':
        return 'MEDIUM';
      case 'ROLE_REMOVED':
        return 'HIGH';
      case 'ROLE_ACTIVATED':
        return 'LOW';
      case 'BULK_ASSIGNMENT':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }
}

export default NotificationService;