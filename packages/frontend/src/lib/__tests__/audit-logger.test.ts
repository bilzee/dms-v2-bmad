// lib/__tests__/audit-logger.test.ts

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
// Jest mock implementation

// Use centralized mock system instead of direct Prisma import
import { createMockPrisma } from '../../__tests__/utils/mockPrisma';

const mockPrisma = createMockPrisma();

// Mock the prisma module BEFORE importing auditLogger
jest.mock('../prisma', () => ({
  default: mockPrisma,
}));

// Now import auditLogger after mocking prisma
import { auditLogger } from '../audit-logger';

// Mock console methods to suppress output during tests
const consoleMock = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

// Mock console globally  
global.console = consoleMock as any;

describe('AuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$reset();
    // Reset the audit logger instance buffers
    (auditLogger as any).batchBuffer = [];
    (auditLogger as any).securityBuffer = [];
    (auditLogger as any).flushTimer = null;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('logActivity', () => {
    it('should batch user activities for efficient database writes', async () => {
      const activityData = {
        userId: 'test-user-123',
        eventType: 'LOGIN' as const,
        module: 'auth',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        endpoint: '/api/auth/login',
        statusCode: 200,
        responseTime: 150,
      };

      await auditLogger.logActivity(activityData);

      // Should not call database immediately (batched)
      expect(mockPrisma.userActivity.createMany).not.toHaveBeenCalled();

      // Batch should contain the activity (audit logger uses batchBuffer, not activityBatch)
      expect((auditLogger as any).batchBuffer).toHaveLength(1);
      expect((auditLogger as any).batchBuffer[0]).toMatchObject({
        userId: 'test-user-123',
        eventType: 'LOGIN',
        module: 'auth',
        ipAddress: '192.168.1.1',
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalActivity = {
        eventType: 'API_ACCESS' as const,
        ipAddress: '10.0.0.1',
      };

      await auditLogger.logActivity(minimalActivity);

      const batchedActivity = (auditLogger as any).batchBuffer[0];
      expect(batchedActivity.userId).toBeUndefined();
      expect(batchedActivity.module).toBeUndefined();
      expect(batchedActivity.endpoint).toBeUndefined();
      expect(batchedActivity.statusCode).toBeUndefined();
      expect(batchedActivity.responseTime).toBeUndefined();
    });

    it('should flush batch when it reaches maximum size', async () => {
      // Mock the create method for individual insertions within transaction
      mockPrisma.userActivity.create.mockResolvedValue({
        id: 'mock-activity-id',
        userId: 'user-0',
        eventType: 'API_ACCESS',
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
      });

      // Add activities to reach batch limit (batch size is 50 in the audit-logger)
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(auditLogger.logActivity({
          userId: `user-${i}`,
          eventType: 'API_ACCESS' as const,
          ipAddress: '192.168.1.1',
        }));
      }

      await Promise.all(promises);

      // Should have flushed to database using individual create calls in transaction
      expect(mockPrisma.userActivity.create).toHaveBeenCalledTimes(50);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events immediately (not batched)', async () => {
      mockPrisma.securityEvent.create.mockResolvedValue({
        id: 'mock-security-id',
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Multiple failed login attempts detected',
        userId: 'test-user-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Suspicious User Agent',
        details: {
          attemptCount: 5,
          timeWindow: '5 minutes',
        },
        timestamp: new Date(),
      });

      const securityEvent = {
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH' as const,
        description: 'Multiple failed login attempts detected',
        userId: 'test-user-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Suspicious User Agent',
        details: {
          attemptCount: 5,
          timeWindow: '5 minutes',
        },
      };

      await auditLogger.logSecurityEvent(securityEvent);

      // Should call database immediately (security events are not batched)
      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'SUSPICIOUS_ACTIVITY',
          severity: 'HIGH',
          description: 'Multiple failed login attempts detected',
          userId: 'test-user-123',
        })
      });
    });

    it('should handle security event persistence', async () => {
      mockPrisma.securityEvent.create.mockResolvedValue({
        id: 'mock-security-breach-id',
        eventType: 'DATA_BREACH',
        severity: 'CRITICAL',
        description: 'Unauthorized data access detected',
        ipAddress: '10.0.0.1',
        timestamp: new Date(),
      });

      await auditLogger.logSecurityEvent({
        eventType: 'DATA_BREACH',
        severity: 'CRITICAL' as const,
        description: 'Unauthorized data access detected',
        ipAddress: '10.0.0.1',
      });

      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'DATA_BREACH',
          severity: 'CRITICAL',
          description: 'Unauthorized data access detected',
          ipAddress: '10.0.0.1',
        })
      });
    });

    it('should handle JSON serialization of details object', async () => {
      const complexDetails = {
        requestHeaders: { 'X-Forwarded-For': '192.168.1.1' },
        requestBody: { username: 'admin', password: '***' },
        stackTrace: ['Error at line 1', 'Error at line 2'],
        metadata: { source: 'intrusion-detection', confidence: 0.95 },
      };

      mockPrisma.securityEvent.create.mockResolvedValue({
        id: 'mock-malicious-request-id',
        eventType: 'MALICIOUS_REQUEST',
        severity: 'MEDIUM',
        description: 'Potential SQL injection attempt',
        ipAddress: '192.168.1.1',
        details: complexDetails,
        timestamp: new Date(),
      });

      await auditLogger.logSecurityEvent({
        eventType: 'MALICIOUS_REQUEST',
        severity: 'MEDIUM' as const,
        description: 'Potential SQL injection attempt',
        ipAddress: '192.168.1.1',
        details: complexDetails,
      });

      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: complexDetails,
        })
      });
    });
  });

  describe('flushActivityBuffer', () => {
    it('should write all batched activities to database', async () => {
      mockPrisma.userActivity.create.mockResolvedValue({
        id: 'mock-activity-id',
        eventType: 'LOGIN',
        ipAddress: '192.168.1.1',
        userId: 'user-1',
        timestamp: new Date(),
      });

      // Add some activities to batch (security events are logged immediately)
      await auditLogger.logActivity({
        eventType: 'LOGIN' as const,
        ipAddress: '192.168.1.1',
        userId: 'user-1',
      });

      await auditLogger.logActivity({
        eventType: 'LOGOUT' as const,
        ipAddress: '192.168.1.1',
        userId: 'user-1',
      });

      // Verify activities are batched
      expect((auditLogger as any).batchBuffer).toHaveLength(2);

      // Manually flush
      await (auditLogger as any).flushActivityBuffer();

      // Should have written activities using individual create calls in transaction
      expect(mockPrisma.userActivity.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));

      // Batch should be empty after flush
      expect((auditLogger as any).batchBuffer).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.$transaction.mockRejectedValue(dbError);

      await auditLogger.logActivity({
        eventType: 'ERROR' as const,
        ipAddress: '192.168.1.1',
      });

      // Manually flush should not throw
      await expect((auditLogger as any).flushActivityBuffer()).resolves.not.toThrow();

      // Should log the error
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Failed to flush activity buffer:',
        dbError
      );
    });

    it('should not attempt database operations when batches are empty', async () => {
      await (auditLogger as any).flushActivityBuffer();

      expect(mockPrisma.userActivity.create).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('automatic batch flushing', () => {
    it('should flush batches automatically after timeout', async () => {
      jest.useFakeTimers();
      mockPrisma.userActivity.create.mockResolvedValue({
        id: 'mock-activity-id',
        eventType: 'API_ACCESS',
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
      });

      await auditLogger.logActivity({
        eventType: 'API_ACCESS' as const,
        ipAddress: '192.168.1.1',
      });

      expect(mockPrisma.userActivity.create).not.toHaveBeenCalled();

      // Fast-forward time by 30 seconds (actual flush interval in audit-logger)
      jest.advanceTimersByTime(30000);

      // Wait for next tick to allow promise resolution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockPrisma.userActivity.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('shutdown', () => {
    it('should flush all remaining batches and clear timers', async () => {
      jest.useFakeTimers();
      mockPrisma.userActivity.create.mockResolvedValue({
        id: 'mock-shutdown-activity-id',
        eventType: 'LOGOUT',
        ipAddress: '192.168.1.1',
        userId: 'user-shutdown-test',
        timestamp: new Date(),
      });

      await auditLogger.logActivity({
        eventType: 'LOGOUT' as const,
        ipAddress: '192.168.1.1',
        userId: 'user-shutdown-test',
      });

      // Should not have flushed yet
      expect(mockPrisma.userActivity.create).not.toHaveBeenCalled();

      // Shutdown should flush immediately
      await auditLogger.shutdown();

      expect(mockPrisma.userActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ 
          eventType: 'LOGOUT',
          userId: 'user-shutdown-test' 
        })
      });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Timer should be cleared (property is flushTimer, not batchTimer)
      expect((auditLogger as any).flushTimer).toBeUndefined();

      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should continue operating after database errors', async () => {
      mockPrisma.$transaction
        .mockRejectedValueOnce(new Error('Database error'))
        .mockImplementationOnce(async (fn) => {
          // Second transaction should succeed
          return await fn(mockPrisma);
        });

      mockPrisma.userActivity.create.mockResolvedValue({
        id: 'mock-recovery-id',
        eventType: 'LOGIN',
        ipAddress: '192.168.1.1',
        userId: 'recovery-test',
        timestamp: new Date(),
      });

      // First activity should fail to flush but not crash
      await auditLogger.logActivity({
        eventType: 'ERROR' as const,
        ipAddress: '192.168.1.1',
      });

      // Force flush to trigger error
      await (auditLogger as any).flushActivityBuffer();

      // Should have logged error
      expect(consoleMock.error).toHaveBeenCalled();

      // Should still be able to log more activities
      await auditLogger.logActivity({
        eventType: 'LOGIN' as const,
        ipAddress: '192.168.1.1',
        userId: 'recovery-test',
      });

      await (auditLogger as any).flushActivityBuffer();

      // Second flush should succeed
      expect(mockPrisma.userActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ 
          eventType: 'LOGIN',
          userId: 'recovery-test' 
        })
      });
    });
  });
});