// lib/audit-logger.ts

import { SystemActivityLog, SecurityEvent } from '@dms/shared/types/admin';
import prisma from './prisma';

/**
 * Audit Logger Service
 * Handles logging of user activities and security events to the database
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private batchBuffer: SystemActivityLog[] = [];
  private securityBuffer: SecurityEvent[] = [];
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.startBatchProcessor();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log a user activity with batching support for performance
   */
  async logActivity(activity: Omit<SystemActivityLog, 'id'>): Promise<void> {
    try {
      // For high-priority events, log immediately
      if (activity.severity === 'CRITICAL' || activity.eventType === 'SECURITY_EVENT') {
        await this.persistActivity(activity);
        return;
      }

      // Add to batch buffer
      this.batchBuffer.push(activity as SystemActivityLog);

      // Flush if buffer is full
      if (this.batchBuffer.length >= this.batchSize) {
        await this.flushActivityBuffer();
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Fallback: try to log directly to console for debugging
      console.warn('Activity log:', JSON.stringify(activity, null, 2));
    }
  }

  /**
   * Log a security event (always immediate, never batched)
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id'>): Promise<void> {
    try {
      await this.persistSecurityEvent(event);
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Fallback: try to log directly to console for critical events
      console.warn('Security event:', JSON.stringify(event, null, 2));
    }
  }

  /**
   * Persist activity log to database
   */
  private async persistActivity(activity: Omit<SystemActivityLog, 'id'>): Promise<void> {
    try {
      // Use the new UserActivity model with all the enhanced fields
      await prisma.userActivity.create({
        data: {
          userId: activity.userId,
          userName: activity.userName,
          action: activity.action,
          resource: activity.resource,
          resourceId: activity.resourceId,
          details: activity.details || {},
          eventType: activity.eventType,
          severity: activity.severity,
          module: activity.module,
          method: activity.method,
          endpoint: activity.endpoint,
          statusCode: activity.statusCode,
          responseTime: activity.responseTime,
          errorMessage: activity.errorMessage,
          oldData: activity.oldData,
          newData: activity.newData,
          geoLocation: activity.geoLocation,
          deviceInfo: activity.deviceInfo,
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
          sessionId: activity.sessionId,
          timestamp: activity.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to persist activity log:', error);
      throw error;
    }
  }

  /**
   * Persist security event to database
   */
  private async persistSecurityEvent(event: Omit<SecurityEvent, 'id'>): Promise<void> {
    try {
      await prisma.securityEvent.create({
        data: {
          eventType: event.eventType,
          severity: event.severity,
          userId: event.userId,
          userName: event.userName,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          description: event.description,
          details: event.details || {},
          actionTaken: event.actionTaken,
          requiresInvestigation: event.requiresInvestigation,
          investigationStatus: event.investigationStatus,
          investigatedBy: event.investigatedBy,
          investigatedAt: event.investigatedAt,
          resolutionNotes: event.resolutionNotes,
          timestamp: event.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to persist security event:', error);
      throw error;
    }
  }

  /**
   * Flush batched activity logs to database
   */
  private async flushActivityBuffer(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      // Use transaction for batch insert
      await prisma.$transaction(async (tx) => {
        for (const activity of batch) {
          await this.persistActivity(activity);
        }
      });
    } catch (error) {
      console.error('Failed to flush activity buffer:', error);
      // Put failed items back in buffer for retry
      this.batchBuffer.unshift(...batch);
    }
  }

  /**
   * Start the batch processor timer
   */
  private startBatchProcessor(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushActivityBuffer();
    }, this.flushInterval);
  }

  /**
   * Stop the batch processor and flush remaining items
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushActivityBuffer();
  }

  /**
   * Map activity action to sync action enum
   */
  private mapActionToSyncAction(action: string): 'CREATE' | 'UPDATE' | 'DELETE' {
    if (action.includes('POST') || action.includes('create')) {
      return 'CREATE';
    } else if (action.includes('PUT') || action.includes('PATCH') || action.includes('update')) {
      return 'UPDATE';
    } else if (action.includes('DELETE') || action.includes('delete')) {
      return 'DELETE';
    }
    return 'UPDATE'; // Default fallback
  }

  /**
   * Get activity logs with filtering and pagination
   */
  async getActivityLogs(filters: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    eventType?: string[];
    severity?: string[];
    module?: string[];
    limit?: number;
    offset?: number;
  }) {
    const whereConditions: any = {};

    if (filters.userId) {
      whereConditions.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      whereConditions.timestamp = {};
      if (filters.startDate) {
        whereConditions.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereConditions.timestamp.lte = filters.endDate;
      }
    }

    if (filters.eventType && filters.eventType.length > 0) {
      whereConditions.eventType = { in: filters.eventType };
    }

    if (filters.severity && filters.severity.length > 0) {
      whereConditions.severity = { in: filters.severity };
    }

    if (filters.module && filters.module.length > 0) {
      whereConditions.module = { in: filters.module };
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await prisma.userActivity.findMany({
      where: whereConditions,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });

    return result;
  }

  /**
   * Get security events with filtering
   */
  async getSecurityEvents(filters: {
    eventType?: string[];
    severity?: string[];
    userId?: string;
    requiresInvestigation?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const whereConditions: any = {};

    if (filters.eventType && filters.eventType.length > 0) {
      whereConditions.eventType = { in: filters.eventType };
    }

    if (filters.severity && filters.severity.length > 0) {
      whereConditions.severity = { in: filters.severity };
    }

    if (filters.userId) {
      whereConditions.userId = filters.userId;
    }

    if (filters.requiresInvestigation !== undefined) {
      whereConditions.requiresInvestigation = filters.requiresInvestigation;
    }

    if (filters.startDate || filters.endDate) {
      whereConditions.timestamp = {};
      if (filters.startDate) {
        whereConditions.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereConditions.timestamp.lte = filters.endDate;
      }
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await prisma.securityEvent.findMany({
      where: whereConditions,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });

    return result;
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await auditLogger.shutdown();
});

process.on('SIGINT', async () => {
  await auditLogger.shutdown();
});