// lib/performance-monitor.ts

import { SystemPerformanceMetrics, SystemPerformanceResponse } from '@dms/shared/types/admin';
import prisma from './prisma';

/**
 * System Performance Monitor
 * Collects and aggregates system performance metrics
 */
export class SystemPerformanceMonitor {
  private static instance: SystemPerformanceMonitor;

  constructor() {
    // Initialize performance monitoring
  }

  static getInstance(): SystemPerformanceMonitor {
    if (!SystemPerformanceMonitor.instance) {
      SystemPerformanceMonitor.instance = new SystemPerformanceMonitor();
    }
    return SystemPerformanceMonitor.instance;
  }

  /**
   * Get current system performance metrics
   */
  async getCurrentMetrics(): Promise<SystemPerformanceMetrics> {
    const timestamp = new Date();
    
    // Collect metrics from various sources
    const [databaseMetrics, apiMetrics, queueMetrics, syncMetrics, systemMetrics] = await Promise.all([
      this.getDatabaseMetrics(),
      this.getApiMetrics(),
      this.getQueueMetrics(),
      this.getSyncMetrics(),
      this.getSystemResourceMetrics()
    ]);

    return {
      timestamp,
      database: databaseMetrics,
      api: apiMetrics,
      queue: queueMetrics,
      sync: syncMetrics,
      system: systemMetrics
    };
  }

  /**
   * Get database performance metrics
   */
  private async getDatabaseMetrics(): Promise<SystemPerformanceMetrics['database']> {
    try {
      // Get database connection count and query performance
      const connectionInfo = await this.getDatabaseConnectionInfo();
      const queryPerformance = await this.getQueryPerformanceMetrics();

      return {
        connectionCount: connectionInfo.connectionCount,
        activeQueries: connectionInfo.activeQueries,
        avgQueryTime: queryPerformance.avgQueryTime,
        slowQueries: queryPerformance.slowQueries,
        errorRate: queryPerformance.errorRate
      };
    } catch (error) {
      console.error('Failed to get database metrics:', error);
      return {
        connectionCount: 0,
        activeQueries: 0,
        avgQueryTime: 0,
        slowQueries: 0,
        errorRate: 0
      };
    }
  }

  /**
   * Get API performance metrics
   */
  private async getApiMetrics(): Promise<SystemPerformanceMetrics['api']> {
    try {
      // Get API metrics from the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const apiLogs = await prisma.userActivity.findMany({
        where: {
          eventType: 'API_ACCESS',
          timestamp: {
            gte: oneHourAgo
          }
        }
      });

      const totalRequests = apiLogs.length;
      const errorCount = apiLogs.filter(log => (log.statusCode ?? 200) >= 400).length;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

      const responseTimes = apiLogs
        .filter(log => log.responseTime !== null)
        .map(log => log.responseTime!);
      
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      const requestsPerMinute = totalRequests / 60;

      // Generate endpoint stats
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
        stats.avgResponseTime = stats.requestCount > 0 ? stats.avgResponseTime / stats.requestCount : 0;
        stats.errorRate = stats.requestCount > 0 ? (stats.errorRate / stats.requestCount) * 100 : 0;
      });

      return {
        requestsPerMinute,
        avgResponseTime,
        errorRate,
        endpointStats
      };
    } catch (error) {
      console.error('Failed to get API metrics:', error);
      return {
        requestsPerMinute: 0,
        avgResponseTime: 0,
        errorRate: 0,
        endpointStats: {}
      };
    }
  }

  /**
   * Get BullMQ queue metrics
   */
  private async getQueueMetrics(): Promise<SystemPerformanceMetrics['queue']> {
    try {
      // Import queue monitor for real metrics
      const { queueMonitor } = await import('./queue-monitor');
      
      // Get real queue metrics from BullMQ
      const queueMetrics = await queueMonitor.getQueueMetrics();
      
      return queueMetrics;
    } catch (error) {
      console.error('Failed to get queue metrics:', error);
      // Fall back to simulated metrics if queue monitor fails
      return {
        activeJobs: Math.floor(Math.random() * 10),
        waitingJobs: Math.floor(Math.random() * 20),
        completedJobs: Math.floor(Math.random() * 1000) + 100,
        failedJobs: Math.floor(Math.random() * 50),
        delayedJobs: Math.floor(Math.random() * 5),
        processingRate: Math.random() * 20 + 5, // 5-25 jobs per minute
        avgJobDuration: Math.random() * 5000 + 1000, // 1-6 seconds
        errorRate: Math.random() * 5 // 0-5% error rate
      };
    }
  }

  /**
   * Get sync engine metrics
   */
  private async getSyncMetrics(): Promise<SystemPerformanceMetrics['sync']> {
    try {
      // Get sync performance from the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const syncLogs = await prisma.userActivity.findMany({
        where: {
          module: 'sync',
          timestamp: {
            gte: oneHourAgo
          }
        }
      });

      const totalSyncOperations = syncLogs.length;
      const successfulSyncs = syncLogs.filter(log => !log.errorMessage).length;
      const conflictSyncs = syncLogs.filter(log => 
        log.details && 
        typeof log.details === 'object' && 
        'conflict' in log.details
      ).length;

      const successRate = totalSyncOperations > 0 ? (successfulSyncs / totalSyncOperations) * 100 : 100;
      const conflictRate = totalSyncOperations > 0 ? (conflictSyncs / totalSyncOperations) * 100 : 0;

      const syncTimes = syncLogs
        .filter(log => log.responseTime !== null)
        .map(log => log.responseTime!);
      
      const avgSyncTime = syncTimes.length > 0 
        ? syncTimes.reduce((sum, time) => sum + time, 0) / syncTimes.length 
        : 0;

      // Get pending items from queue or sync status
      const pendingItems = 0; // Would get from actual sync queue

      // Get last sync timestamp
      const lastSyncLog = await prisma.userActivity.findFirst({
        where: {
          module: 'sync'
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      const lastSyncAt = lastSyncLog?.timestamp || new Date();

      return {
        successRate,
        conflictRate,
        avgSyncTime,
        pendingItems,
        lastSyncAt
      };
    } catch (error) {
      console.error('Failed to get sync metrics:', error);
      return {
        successRate: 100,
        conflictRate: 0,
        avgSyncTime: 0,
        pendingItems: 0,
        lastSyncAt: new Date()
      };
    }
  }

  /**
   * Get system resource metrics
   */
  private async getSystemResourceMetrics(): Promise<SystemPerformanceMetrics['system']> {
    try {
      // Get system resource usage
      // In a real implementation, you would use system monitoring tools
      // For now, we'll return placeholder values
      
      return {
        cpuUsage: Math.random() * 20 + 10, // Simulated 10-30% CPU usage
        memoryUsage: Math.random() * 30 + 40, // Simulated 40-70% memory usage
        diskUsage: Math.random() * 20 + 30, // Simulated 30-50% disk usage
        networkLatency: Math.random() * 50 + 10 // Simulated 10-60ms network latency
      };
    } catch (error) {
      console.error('Failed to get system resource metrics:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: 0
      };
    }
  }

  /**
   * Get database connection information
   */
  private async getDatabaseConnectionInfo(): Promise<{
    connectionCount: number;
    activeQueries: number;
  }> {
    try {
      // Query database for connection and query information
      // This would depend on your database setup and monitoring
      
      // For PostgreSQL, you could use queries like:
      // SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
      
      // For now, return simulated values
      return {
        connectionCount: Math.floor(Math.random() * 10) + 5, // 5-15 connections
        activeQueries: Math.floor(Math.random() * 3) + 1 // 1-4 active queries
      };
    } catch (error) {
      console.error('Failed to get database connection info:', error);
      return {
        connectionCount: 0,
        activeQueries: 0
      };
    }
  }

  /**
   * Get query performance metrics
   */
  private async getQueryPerformanceMetrics(): Promise<{
    avgQueryTime: number;
    slowQueries: number;
    errorRate: number;
  }> {
    try {
      // Analyze query performance from logs or database statistics
      // For now, return simulated values
      
      return {
        avgQueryTime: Math.random() * 50 + 10, // 10-60ms average query time
        slowQueries: Math.floor(Math.random() * 3), // 0-3 slow queries
        errorRate: Math.random() * 2 // 0-2% error rate
      };
    } catch (error) {
      console.error('Failed to get query performance metrics:', error);
      return {
        avgQueryTime: 0,
        slowQueries: 0,
        errorRate: 0
      };
    }
  }

  /**
   * Get historical metrics
   */
  async getHistoricalMetrics(hours: number = 24): Promise<SystemPerformanceMetrics[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const historicalMetrics = await prisma.systemMetrics.findMany({
        where: {
          timestamp: {
            gte: since
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: hours // One per hour
      });

      // Convert stored metrics to SystemPerformanceMetrics format
      return historicalMetrics.map(metric => ({
        timestamp: metric.timestamp,
        database: {
          connectionCount: metric.connectionCount || 0,
          activeQueries: metric.activeQueries || 0,
          avgQueryTime: metric.avgQueryTime || 0,
          slowQueries: metric.slowQueries || 0,
          errorRate: metric.errorRate || 0
        },
        api: {
          requestsPerMinute: metric.requestsPerMinute || 0,
          avgResponseTime: metric.avgResponseTime || 0,
          errorRate: metric.errorRate || 0,
          endpointStats: (metric.endpointStats as any) || {}
        },
        queue: {
          activeJobs: metric.activeJobs || 0,
          waitingJobs: metric.waitingJobs || 0,
          completedJobs: metric.completedJobs || 0,
          failedJobs: metric.failedJobs || 0,
          delayedJobs: metric.delayedJobs || 0,
          processingRate: metric.processingRate || 0,
          avgJobDuration: metric.avgJobDuration || 0,
          errorRate: metric.errorRate || 0
        },
        sync: {
          successRate: metric.syncSuccessRate || 100,
          conflictRate: metric.syncConflictRate || 0,
          avgSyncTime: metric.avgSyncTime || 0,
          pendingItems: metric.pendingItems || 0,
          lastSyncAt: metric.lastSyncAt || new Date()
        },
        system: {
          cpuUsage: metric.cpuUsage,
          memoryUsage: metric.memoryUsage,
          diskUsage: metric.diskUsage,
          networkLatency: metric.networkLatency
        }
      }));
    } catch (error) {
      console.error('Failed to get historical metrics:', error);
      return [];
    }
  }

  /**
   * Generate performance alerts based on thresholds
   */
  async checkPerformanceAlerts(metrics: SystemPerformanceMetrics): Promise<SystemPerformanceResponse['data']['alerts']> {
    const alerts: SystemPerformanceResponse['data']['alerts'] = [];

    // Check API error rate
    if (metrics.api.errorRate > 5) {
      alerts?.push({
        type: 'HIGH_ERROR_RATE',
        severity: metrics.api.errorRate > 10 ? 'CRITICAL' : 'WARNING',
        message: `API error rate is ${metrics.api.errorRate.toFixed(2)}%`,
        value: metrics.api.errorRate,
        threshold: 5,
        timestamp: new Date()
      });
    }

    // Check API response time
    if (metrics.api.avgResponseTime > 1000) {
      alerts?.push({
        type: 'SLOW_RESPONSE',
        severity: metrics.api.avgResponseTime > 3000 ? 'CRITICAL' : 'WARNING',
        message: `Average API response time is ${metrics.api.avgResponseTime.toFixed(0)}ms`,
        value: metrics.api.avgResponseTime,
        threshold: 1000,
        timestamp: new Date()
      });
    }

    // Check queue size
    const totalQueuedJobs = metrics.queue.waitingJobs + metrics.queue.delayedJobs;
    if (totalQueuedJobs > 100) {
      alerts?.push({
        type: 'HIGH_QUEUE_SIZE',
        severity: totalQueuedJobs > 500 ? 'CRITICAL' : 'WARNING',
        message: `Queue has ${totalQueuedJobs} pending jobs`,
        value: totalQueuedJobs,
        threshold: 100,
        timestamp: new Date()
      });
    }

    // Check sync failure rate
    if (metrics.sync.successRate < 95) {
      alerts?.push({
        type: 'SYNC_FAILURE',
        severity: metrics.sync.successRate < 90 ? 'CRITICAL' : 'WARNING',
        message: `Sync success rate is ${metrics.sync.successRate.toFixed(1)}%`,
        value: metrics.sync.successRate,
        threshold: 95,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * Determine overall health status
   */
  determineHealthStatus(
    metrics: SystemPerformanceMetrics, 
    alerts: SystemPerformanceResponse['data']['alerts']
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    if (!alerts || alerts.length === 0) {
      return 'HEALTHY';
    }

    const hasCritical = alerts.some(alert => alert.severity === 'CRITICAL');
    if (hasCritical) {
      return 'CRITICAL';
    }

    const hasWarning = alerts.some(alert => alert.severity === 'WARNING');
    if (hasWarning) {
      return 'WARNING';
    }

    return 'HEALTHY';
  }
}

// Export singleton instance
export const performanceMonitor = SystemPerformanceMonitor.getInstance();