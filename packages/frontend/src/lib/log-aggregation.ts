// lib/log-aggregation.ts

import { LogAggregationSettings } from '@dms/shared/types/admin';
import { auditLogger } from './audit-logger';
import prisma from './prisma';

/**
 * Log Aggregation Service
 * Handles aggregation, retention, archival, and alerting for audit logs
 */
export class LogAggregationService {
  private static instance: LogAggregationService;
  private settings: LogAggregationSettings;
  private aggregationTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Default settings
    this.settings = {
      retentionPeriodDays: 365, // Keep logs for 1 year
      compressionEnabled: true,
      archiveAfterDays: 90, // Archive after 3 months
      alertThresholds: {
        errorRatePercentage: 5.0, // Alert if error rate > 5%
        responseTimeMs: 5000, // Alert if avg response time > 5s
        securityEventsPerHour: 10 // Alert if security events > 10/hour
      }
    };

    this.startAggregationSchedule();
    this.startCleanupSchedule();
  }

  static getInstance(): LogAggregationService {
    if (!LogAggregationService.instance) {
      LogAggregationService.instance = new LogAggregationService();
    }
    return LogAggregationService.instance;
  }

  /**
   * Update aggregation settings
   */
  updateSettings(settings: Partial<LogAggregationSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current settings
   */
  getSettings(): LogAggregationSettings {
    return { ...this.settings };
  }

  /**
   * Aggregate hourly metrics for performance monitoring
   */
  async aggregateHourlyMetrics(): Promise<void> {
    try {
      console.log('Starting hourly metrics aggregation...');
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Aggregate API metrics
      await this.aggregateApiMetrics(hourAgo, now);

      // Aggregate security events
      await this.aggregateSecurityMetrics(hourAgo, now);

      // Aggregate user activity
      await this.aggregateUserActivityMetrics(hourAgo, now);

      // Check alert thresholds
      await this.checkAlertThresholds(hourAgo, now);

      console.log('Hourly metrics aggregation completed');
    } catch (error) {
      console.error('Failed to aggregate hourly metrics:', error);
    }
  }

  /**
   * Aggregate API metrics (response times, error rates, etc.)
   */
  private async aggregateApiMetrics(startTime: Date, endTime: Date): Promise<void> {
    // Get API activity logs for the hour
    const apiLogs = await prisma.userActivity.findMany({
      where: {
        eventType: 'API_ACCESS',
        timestamp: {
          gte: startTime,
          lt: endTime
        }
      }
    });

    if (apiLogs.length === 0) return;

    // Calculate aggregate metrics
    const totalRequests = apiLogs.length;
    const errorCount = apiLogs.filter(log => (log.statusCode ?? 200) >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    const responseTimes = apiLogs
      .filter(log => log.responseTime !== null)
      .map(log => log.responseTime!);
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Group by endpoint
    const endpointStats: Record<string, { requestCount: number; avgResponseTime: number; errorRate: number }> = {};
    
    apiLogs.forEach(log => {
      const endpoint = log.endpoint || 'unknown';
      if (!endpointStats[endpoint]) {
        endpointStats[endpoint] = { requestCount: 0, avgResponseTime: 0, errorRate: 0 };
      }
      
      endpointStats[endpoint].requestCount++;
      if (log.responseTime) {
        endpointStats[endpoint].avgResponseTime += log.responseTime;
      }
      if ((log.statusCode ?? 200) >= 400) {
        endpointStats[endpoint].errorRate++;
      }
    });

    // Calculate final endpoint stats
    Object.keys(endpointStats).forEach(endpoint => {
      const stats = endpointStats[endpoint];
      stats.avgResponseTime = stats.avgResponseTime / stats.requestCount;
      stats.errorRate = (stats.errorRate / stats.requestCount) * 100;
    });

    // Store aggregated metrics
    await prisma.systemMetrics.create({
      data: {
        timestamp: startTime,
        metricType: 'api',
        requestsPerMinute: totalRequests / 60,
        avgResponseTime,
        errorRate,
        endpointStats
      }
    });
  }

  /**
   * Aggregate security event metrics
   */
  private async aggregateSecurityMetrics(startTime: Date, endTime: Date): Promise<void> {
    const securityEvents = await prisma.securityEvent.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lt: endTime
        }
      }
    });

    if (securityEvents.length === 0) return;

    // Count by event type and severity
    const eventTypeStats: Record<string, number> = {};
    const severityStats: Record<string, number> = {};

    securityEvents.forEach(event => {
      eventTypeStats[event.eventType] = (eventTypeStats[event.eventType] || 0) + 1;
      severityStats[event.severity] = (severityStats[event.severity] || 0) + 1;
    });

    const criticalCount = severityStats['CRITICAL'] || 0;
    const highCount = severityStats['HIGH'] || 0;
    const investigationRequiredCount = securityEvents.filter(e => e.requiresInvestigation).length;

    // Store security metrics
    await prisma.systemMetrics.create({
      data: {
        timestamp: startTime,
        metricType: 'security',
        hourlyStats: {
          totalEvents: securityEvents.length,
          criticalEvents: criticalCount,
          highSeverityEvents: highCount,
          investigationRequired: investigationRequiredCount,
          eventTypeBreakdown: eventTypeStats,
          severityBreakdown: severityStats
        }
      }
    });
  }

  /**
   * Aggregate user activity metrics
   */
  private async aggregateUserActivityMetrics(startTime: Date, endTime: Date): Promise<void> {
    const userActivities = await prisma.userActivity.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lt: endTime
        }
      }
    });

    if (userActivities.length === 0) return;

    // Unique users count
    const uniqueUsers = new Set(userActivities.map(activity => activity.userId)).size;

    // Activity by module
    const moduleStats: Record<string, number> = {};
    const eventTypeStats: Record<string, number> = {};

    userActivities.forEach(activity => {
      moduleStats[activity.module] = (moduleStats[activity.module] || 0) + 1;
      eventTypeStats[activity.eventType] = (eventTypeStats[activity.eventType] || 0) + 1;
    });

    // Store user activity metrics
    await prisma.systemMetrics.create({
      data: {
        timestamp: startTime,
        metricType: 'user_activity',
        hourlyStats: {
          totalActivities: userActivities.length,
          uniqueUsers,
          moduleBreakdown: moduleStats,
          eventTypeBreakdown: eventTypeStats
        }
      }
    });
  }

  /**
   * Check alert thresholds and trigger alerts if necessary
   */
  private async checkAlertThresholds(startTime: Date, endTime: Date): Promise<void> {
    // Check API error rate
    const apiMetrics = await prisma.systemMetrics.findFirst({
      where: {
        metricType: 'api',
        timestamp: startTime
      }
    });

    if (apiMetrics && apiMetrics.errorRate && apiMetrics.errorRate > this.settings.alertThresholds.errorRatePercentage) {
      await this.createAlert({
        type: 'HIGH_ERROR_RATE',
        severity: 'WARNING',
        message: `API error rate (${apiMetrics.errorRate.toFixed(2)}%) exceeds threshold (${this.settings.alertThresholds.errorRatePercentage}%)`,
        threshold: this.settings.alertThresholds.errorRatePercentage,
        currentValue: apiMetrics.errorRate
      });
    }

    // Check API response time
    if (apiMetrics && apiMetrics.avgResponseTime && apiMetrics.avgResponseTime > this.settings.alertThresholds.responseTimeMs) {
      await this.createAlert({
        type: 'SLOW_RESPONSE',
        severity: 'WARNING',
        message: `Average API response time (${apiMetrics.avgResponseTime.toFixed(0)}ms) exceeds threshold (${this.settings.alertThresholds.responseTimeMs}ms)`,
        threshold: this.settings.alertThresholds.responseTimeMs,
        currentValue: apiMetrics.avgResponseTime
      });
    }

    // Check security events per hour
    const securityMetrics = await prisma.systemMetrics.findFirst({
      where: {
        metricType: 'security',
        timestamp: startTime
      }
    });

    if (securityMetrics && securityMetrics.hourlyStats) {
      const stats = securityMetrics.hourlyStats as any;
      if (stats.totalEvents && stats.totalEvents > this.settings.alertThresholds.securityEventsPerHour) {
        await this.createAlert({
          type: 'SYNC_FAILURE',
          severity: stats.criticalEvents > 0 ? 'CRITICAL' : 'WARNING',
          message: `Security events (${stats.totalEvents}) exceed threshold (${this.settings.alertThresholds.securityEventsPerHour}) in the last hour`,
          threshold: this.settings.alertThresholds.securityEventsPerHour,
          currentValue: stats.totalEvents
        });
      }
    }
  }

  /**
   * Create a system alert
   */
  private async createAlert(alert: {
    type: string;
    severity: 'WARNING' | 'CRITICAL';
    message: string;
    threshold: number;
    currentValue: number;
  }): Promise<void> {
    try {
      // Check if we already have a recent alert of this type
      const recentAlert = await prisma.systemAlert.findFirst({
        where: {
          type: alert.type,
          isActive: true,
          lastTriggered: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        }
      });

      if (recentAlert) {
        // Update existing alert
        await prisma.systemAlert.update({
          where: { id: recentAlert.id },
          data: {
            currentValue: alert.currentValue,
            lastTriggered: new Date(),
            triggerCount: recentAlert.triggerCount + 1,
            message: alert.message
          }
        });
      } else {
        // Create new alert
        await prisma.systemAlert.create({
          data: {
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            threshold: alert.threshold,
            currentValue: alert.currentValue,
            lastTriggered: new Date(),
            triggerCount: 1,
            createdBy: 'system',
            createdByName: 'Log Aggregation Service'
          }
        });
      }

      console.log(`Alert created: ${alert.type} - ${alert.message}`);
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  /**
   * Clean up old logs based on retention policy
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      console.log('Starting log cleanup...');
      const cutoffDate = new Date(Date.now() - this.settings.retentionPeriodDays * 24 * 60 * 60 * 1000);

      // Clean up old user activities
      const deletedActivities = await prisma.userActivity.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      // Clean up old security events (keep for longer due to compliance)
      const securityCutoffDate = new Date(Date.now() - (this.settings.retentionPeriodDays * 2) * 24 * 60 * 60 * 1000);
      const deletedSecurityEvents = await prisma.securityEvent.deleteMany({
        where: {
          timestamp: {
            lt: securityCutoffDate
          },
          investigationStatus: {
            in: ['RESOLVED', 'FALSE_POSITIVE']
          }
        }
      });

      // Clean up old system metrics
      const deletedMetrics = await prisma.systemMetrics.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      // Clean up expired audit exports
      await prisma.auditExport.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      console.log(`Log cleanup completed:
        - User Activities: ${deletedActivities.count} deleted
        - Security Events: ${deletedSecurityEvents.count} deleted  
        - System Metrics: ${deletedMetrics.count} deleted`);
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Start the aggregation schedule (runs every hour)
   */
  private startAggregationSchedule(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregateHourlyMetrics();
    }, 60 * 60 * 1000); // Every hour

    // Run initial aggregation after 5 minutes
    setTimeout(() => {
      this.aggregateHourlyMetrics();
    }, 5 * 60 * 1000);
  }

  /**
   * Start the cleanup schedule (runs daily)
   */
  private startCleanupSchedule(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    // Run initial cleanup after 10 minutes
    setTimeout(() => {
      this.cleanupOldLogs();
    }, 10 * 60 * 1000);
  }

  /**
   * Get aggregation statistics
   */
  async getAggregationStats(): Promise<{
    totalUserActivities: number;
    totalSecurityEvents: number;
    totalSystemMetrics: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
    retentionPeriodDays: number;
  }> {
    const [userActivityCount, securityEventCount, systemMetricsCount] = await Promise.all([
      prisma.userActivity.count(),
      prisma.securityEvent.count(),
      prisma.systemMetrics.count()
    ]);

    const oldestActivity = await prisma.userActivity.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true }
    });

    const newestActivity = await prisma.userActivity.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true }
    });

    return {
      totalUserActivities: userActivityCount,
      totalSecurityEvents: securityEventCount,
      totalSystemMetrics: systemMetricsCount,
      oldestRecord: oldestActivity?.timestamp || null,
      newestRecord: newestActivity?.timestamp || null,
      retentionPeriodDays: this.settings.retentionPeriodDays
    };
  }

  /**
   * Shutdown the aggregation service
   */
  async shutdown(): Promise<void> {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    console.log('Log aggregation service shutdown');
  }
}

// Export singleton instance
export const logAggregationService = LogAggregationService.getInstance();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await logAggregationService.shutdown();
});

process.on('SIGINT', async () => {
  await logAggregationService.shutdown();
});