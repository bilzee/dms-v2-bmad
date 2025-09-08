// lib/__tests__/performance-monitor.test.ts

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { performanceMonitor } from '../performance-monitor';
// Jest mock implementation

// Mock Prisma with centralized mock system
import { createMockPrisma } from '../../__tests__/utils/mockPrisma';

const mockPrisma = createMockPrisma();
jest.mock('../prisma', () => ({
  default: mockPrisma,
}));

// Mock queue monitor
const mockQueueMonitor = {
  getQueueMetrics: jest.fn(),
};
jest.mock('../queue-monitor', () => ({
  queueMonitor: mockQueueMonitor,
}));

// Mock console to suppress output during tests
const consoleMock = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};
// Mock console globally
global.console = consoleMock as any;

describe('SystemPerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$reset();
    
    // Setup default mock responses - no need to mock since createMockPrisma provides working implementations
    
    mockQueueMonitor.getQueueMetrics.mockResolvedValue({
      activeJobs: 3,
      waitingJobs: 12,
      completedJobs: 1542,
      failedJobs: 23,
      delayedJobs: 2,
      processingRate: 15.5,
      avgJobDuration: 2500,
      errorRate: 1.5,
    });
  });

  describe('getCurrentMetrics', () => {
    it('should collect comprehensive system performance metrics', async () => {
      // Mock API activity logs
      mockPrisma.userActivity.findMany.mockResolvedValue([
        {
          eventType: 'API_ACCESS',
          statusCode: 200,
          responseTime: 150,
          endpoint: '/api/incidents',
          timestamp: new Date(),
        },
        {
          eventType: 'API_ACCESS',
          statusCode: 404,
          responseTime: 50,
          endpoint: '/api/users',
          timestamp: new Date(),
        },
        {
          eventType: 'API_ACCESS',
          statusCode: 200,
          responseTime: 300,
          endpoint: '/api/incidents',
          timestamp: new Date(),
        },
      ]);

      const metrics = await performanceMonitor.getCurrentMetrics();

      expect(metrics).toMatchObject({
        timestamp: expect.any(Date),
        database: expect.objectContaining({
          connectionCount: expect.any(Number),
          activeQueries: expect.any(Number),
          avgQueryTime: expect.any(Number),
          slowQueries: expect.any(Number),
          errorRate: expect.any(Number),
        }),
        api: expect.objectContaining({
          requestsPerMinute: expect.any(Number),
          avgResponseTime: expect.any(Number),
          errorRate: expect.any(Number),
          endpointStats: expect.any(Object),
        }),
        queue: expect.objectContaining({
          activeJobs: 3,
          waitingJobs: 12,
          completedJobs: 1542,
          failedJobs: 23,
          delayedJobs: 2,
          processingRate: 15.5,
          avgJobDuration: 2500,
          errorRate: 1.5,
        }),
        sync: expect.objectContaining({
          successRate: expect.any(Number),
          conflictRate: expect.any(Number),
          avgSyncTime: expect.any(Number),
          pendingItems: expect.any(Number),
          lastSyncAt: expect.any(Date),
        }),
        system: expect.objectContaining({
          cpuUsage: expect.any(Number),
          memoryUsage: expect.any(Number),
          diskUsage: expect.any(Number),
          networkLatency: expect.any(Number),
        }),
      });
    });

    it('should calculate API metrics correctly from activity logs', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      mockPrisma.userActivity.findMany.mockResolvedValue([
        // 3 successful requests
        { eventType: 'API_ACCESS', statusCode: 200, responseTime: 100, endpoint: '/api/test' },
        { eventType: 'API_ACCESS', statusCode: 200, responseTime: 200, endpoint: '/api/test' },
        { eventType: 'API_ACCESS', statusCode: 200, responseTime: 300, endpoint: '/api/other' },
        // 1 error request
        { eventType: 'API_ACCESS', statusCode: 500, responseTime: 150, endpoint: '/api/test' },
      ]);

      const metrics = await performanceMonitor.getCurrentMetrics();

      expect(metrics.api.requestsPerMinute).toBeCloseTo(4 / 60, 2); // 4 requests in 1 hour = 4/60 per minute
      expect(metrics.api.avgResponseTime).toBe(187.5); // (100 + 200 + 300 + 150) / 4
      expect(metrics.api.errorRate).toBe(25); // 1 error out of 4 requests = 25%

      // Check endpoint stats
      expect(metrics.api.endpointStats['/api/test']).toMatchObject({
        requestCount: 3,
        avgResponseTime: 150, // (100 + 200 + 150) / 3
        errorRate: expect.closeTo(33.33, 1), // 1 error out of 3 requests
      });

      expect(metrics.api.endpointStats['/api/other']).toMatchObject({
        requestCount: 1,
        avgResponseTime: 300,
        errorRate: 0,
      });
    });

    it('should handle empty API logs gracefully', async () => {
      mockPrisma.userActivity.findMany.mockResolvedValue([]);

      const metrics = await performanceMonitor.getCurrentMetrics();

      expect(metrics.api).toMatchObject({
        requestsPerMinute: 0,
        avgResponseTime: 0,
        errorRate: 0,
        endpointStats: {},
      });
    });

    it('should calculate sync metrics from sync activity logs', async () => {
      const syncLogs = [
        { module: 'sync', responseTime: 100, errorMessage: null, details: null },
        { module: 'sync', responseTime: 200, errorMessage: null, details: { conflict: true } },
        { module: 'sync', responseTime: 150, errorMessage: 'Sync failed', details: null },
      ];

      mockPrisma.userActivity.findMany.mockImplementation((query) => {
        if (query.where?.module === 'sync') {
          return Promise.resolve(syncLogs);
        }
        return Promise.resolve([]);
      });

      mockPrisma.userActivity.findFirst.mockResolvedValue({
        timestamp: new Date(),
        module: 'sync',
      });

      const metrics = await performanceMonitor.getCurrentMetrics();

      expect(metrics.sync.successRate).toBeCloseTo(66.67, 1); // 2 successful out of 3
      expect(metrics.sync.conflictRate).toBeCloseTo(33.33, 1); // 1 conflict out of 3
      expect(metrics.sync.avgSyncTime).toBe(150); // (100 + 200 + 150) / 3
    });

    it('should fallback to simulated queue metrics when real metrics fail', async () => {
      mockQueueMonitor.getQueueMetrics.mockRejectedValue(new Error('Queue connection failed'));

      const metrics = await performanceMonitor.getCurrentMetrics();

      // Should still return queue metrics (simulated)
      expect(metrics.queue).toMatchObject({
        activeJobs: expect.any(Number),
        waitingJobs: expect.any(Number),
        completedJobs: expect.any(Number),
        failedJobs: expect.any(Number),
        delayedJobs: expect.any(Number),
        processingRate: expect.any(Number),
        avgJobDuration: expect.any(Number),
        errorRate: expect.any(Number),
      });

      expect(consoleMock.error).toHaveBeenCalledWith(
        'Failed to get queue metrics:',
        expect.any(Error)
      );
    });
  });

  describe('getHistoricalMetrics', () => {
    it('should retrieve and format historical metrics correctly', async () => {
      const mockHistoricalData = [
        {
          id: '1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          connectionCount: 15,
          activeQueries: 3,
          avgQueryTime: 45,
          slowQueries: 1,
          errorRate: 2.1,
          requestsPerMinute: 25.5,
          avgResponseTime: 180,
          activeJobs: 5,
          waitingJobs: 12,
          completedJobs: 1200,
          failedJobs: 15,
          delayedJobs: 2,
          processingRate: 18.3,
          avgJobDuration: 2200,
          syncSuccessRate: 98.5,
          syncConflictRate: 1.2,
          avgSyncTime: 85,
          pendingItems: 3,
          lastSyncAt: new Date('2024-01-01T09:55:00Z'),
          cpuUsage: 25.3,
          memoryUsage: 62.8,
          diskUsage: 45.2,
          networkLatency: 28,
          endpointStats: { '/api/test': { requestCount: 100, avgResponseTime: 150, errorRate: 2 } },
        },
      ];

      mockPrisma.systemMetrics.findMany.mockResolvedValue(mockHistoricalData);

      const historicalMetrics = await performanceMonitor.getHistoricalMetrics(24);

      expect(historicalMetrics).toHaveLength(1);
      expect(historicalMetrics[0]).toMatchObject({
        timestamp: new Date('2024-01-01T10:00:00Z'),
        database: {
          connectionCount: 15,
          activeQueries: 3,
          avgQueryTime: 45,
          slowQueries: 1,
          errorRate: 2.1,
        },
        api: {
          requestsPerMinute: 25.5,
          avgResponseTime: 180,
          errorRate: 2.1,
          endpointStats: { '/api/test': { requestCount: 100, avgResponseTime: 150, errorRate: 2 } },
        },
        queue: {
          activeJobs: 5,
          waitingJobs: 12,
          completedJobs: 1200,
          failedJobs: 15,
          delayedJobs: 2,
          processingRate: 18.3,
          avgJobDuration: 2200,
          errorRate: 2.1,
        },
        sync: {
          successRate: 98.5,
          conflictRate: 1.2,
          avgSyncTime: 85,
          pendingItems: 3,
          lastSyncAt: new Date('2024-01-01T09:55:00Z'),
        },
        system: {
          cpuUsage: 25.3,
          memoryUsage: 62.8,
          diskUsage: 45.2,
          networkLatency: 28,
        },
      });
    });

    it('should handle database errors when fetching historical data', async () => {
      mockPrisma.systemMetrics.findMany.mockRejectedValue(new Error('Database error'));

      const result = await performanceMonitor.getHistoricalMetrics(24);

      expect(result).toEqual([]);
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Failed to get historical metrics:',
        expect.any(Error)
      );
    });
  });

  describe('checkPerformanceAlerts', () => {
    it('should generate alerts for high API error rate', async () => {
      const metrics = {
        api: { errorRate: 7.5, avgResponseTime: 500 },
        queue: { waitingJobs: 25, delayedJobs: 5 },
        sync: { successRate: 98.5 },
      } as any;

      const alerts = await performanceMonitor.checkPerformanceAlerts(metrics);

      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'HIGH_ERROR_RATE',
          severity: 'WARNING',
          message: 'API error rate is 7.50%',
          value: 7.5,
          threshold: 5,
        })
      );
    });

    it('should generate critical alert for very high error rate', async () => {
      const metrics = {
        api: { errorRate: 15, avgResponseTime: 200 },
        queue: { waitingJobs: 10, delayedJobs: 2 },
        sync: { successRate: 99 },
      } as any;

      const alerts = await performanceMonitor.checkPerformanceAlerts(metrics);

      const errorRateAlert = alerts?.find(alert => alert.type === 'HIGH_ERROR_RATE');
      expect(errorRateAlert).toMatchObject({
        type: 'HIGH_ERROR_RATE',
        severity: 'CRITICAL',
        message: 'API error rate is 15.00%',
        value: 15,
        threshold: 5,
      });
    });

    it('should generate alert for slow API response time', async () => {
      const metrics = {
        api: { errorRate: 2, avgResponseTime: 2500 },
        queue: { waitingJobs: 15, delayedJobs: 3 },
        sync: { successRate: 97 },
      } as any;

      const alerts = await performanceMonitor.checkPerformanceAlerts(metrics);

      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'SLOW_RESPONSE',
          severity: 'WARNING',
          message: 'Average API response time is 2500ms',
          value: 2500,
          threshold: 1000,
        })
      );
    });

    it('should generate alert for high queue size', async () => {
      const metrics = {
        api: { errorRate: 2, avgResponseTime: 300 },
        queue: { waitingJobs: 150, delayedJobs: 50 },
        sync: { successRate: 96 },
      } as any;

      const alerts = await performanceMonitor.checkPerformanceAlerts(metrics);

      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'HIGH_QUEUE_SIZE',
          severity: 'WARNING',
          message: 'Queue has 200 pending jobs',
          value: 200,
          threshold: 100,
        })
      );
    });

    it('should generate alert for low sync success rate', async () => {
      const metrics = {
        api: { errorRate: 2, avgResponseTime: 300 },
        queue: { waitingJobs: 20, delayedJobs: 5 },
        sync: { successRate: 88.5 },
      } as any;

      const alerts = await performanceMonitor.checkPerformanceAlerts(metrics);

      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'SYNC_FAILURE',
          severity: 'CRITICAL',
          message: 'Sync success rate is 88.5%',
          value: 88.5,
          threshold: 95,
        })
      );
    });

    it('should not generate alerts when all metrics are within thresholds', async () => {
      const healthyMetrics = {
        api: { errorRate: 2, avgResponseTime: 300 },
        queue: { waitingJobs: 25, delayedJobs: 5 },
        sync: { successRate: 99.2 },
      } as any;

      const alerts = await performanceMonitor.checkPerformanceAlerts(healthyMetrics);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('determineHealthStatus', () => {
    it('should return HEALTHY when no alerts exist', () => {
      const metrics = {} as any;
      const alerts: any[] = [];

      const status = performanceMonitor.determineHealthStatus(metrics, alerts);

      expect(status).toBe('HEALTHY');
    });

    it('should return CRITICAL when critical alerts exist', () => {
      const metrics = {} as any;
      const alerts = [
        { severity: 'WARNING', type: 'HIGH_QUEUE_SIZE' },
        { severity: 'CRITICAL', type: 'HIGH_ERROR_RATE' },
      ] as any;

      const status = performanceMonitor.determineHealthStatus(metrics, alerts);

      expect(status).toBe('CRITICAL');
    });

    it('should return WARNING when only warning alerts exist', () => {
      const metrics = {} as any;
      const alerts = [
        { severity: 'WARNING', type: 'HIGH_QUEUE_SIZE' },
        { severity: 'WARNING', type: 'SLOW_RESPONSE' },
      ] as any;

      const status = performanceMonitor.determineHealthStatus(metrics, alerts);

      expect(status).toBe('WARNING');
    });

    it('should handle null/undefined alerts gracefully', () => {
      const metrics = {} as any;
      const alerts = null as any;

      const status = performanceMonitor.determineHealthStatus(metrics, alerts);

      expect(status).toBe('HEALTHY');
    });
  });
});