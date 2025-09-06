// lib/__tests__/audit-logger.test.ts

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { auditLogger } from '../audit-logger';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';

// Mock Prisma
const mockPrisma = mockDeep<any>();
vi.mock('../prisma', () => ({
  default: mockPrisma,
}));

// Mock console methods to suppress output during tests
const consoleMock = {
  error: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
};

vi.stubGlobal('console', consoleMock);

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the audit logger instance
    (auditLogger as any).activityBatch = [];
    (auditLogger as any).securityEventBatch = [];
    (auditLogger as any).batchTimer = null;
  });

  afterEach(() => {
    vi.clearAllTimers();
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

      // Batch should contain the activity
      expect((auditLogger as any).activityBatch).toHaveLength(1);
      expect((auditLogger as any).activityBatch[0]).toMatchObject({
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

      const batchedActivity = (auditLogger as any).activityBatch[0];
      expect(batchedActivity.userId).toBeNull();
      expect(batchedActivity.module).toBeNull();
      expect(batchedActivity.endpoint).toBeNull();
      expect(batchedActivity.statusCode).toBeNull();
      expect(batchedActivity.responseTime).toBeNull();
    });

    it('should flush batch when it reaches maximum size', async () => {
      mockPrisma.userActivity.createMany.mockResolvedValue({ count: 100 });

      // Add activities to reach batch limit
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(auditLogger.logActivity({
          userId: `user-${i}`,
          eventType: 'API_ACCESS' as const,
          ipAddress: '192.168.1.1',
        }));
      }

      await Promise.all(promises);

      // Should have flushed to database
      expect(mockPrisma.userActivity.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-0' }),
          expect.objectContaining({ userId: 'user-99' }),
        ]),
        skipDuplicates: true,
      });
    });
  });

  describe('logSecurityEvent', () => {
    it('should batch security events for efficient database writes', async () => {
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

      // Should not call database immediately (batched)
      expect(mockPrisma.securityEvent.createMany).not.toHaveBeenCalled();

      // Batch should contain the security event
      expect((auditLogger as any).securityEventBatch).toHaveLength(1);
      expect((auditLogger as any).securityEventBatch[0]).toMatchObject({
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Multiple failed login attempts detected',
        userId: 'test-user-123',
      });
    });

    it('should generate unique IDs for security events', async () => {
      await auditLogger.logSecurityEvent({
        eventType: 'DATA_BREACH',
        severity: 'CRITICAL' as const,
        description: 'Unauthorized data access detected',
        ipAddress: '10.0.0.1',
      });

      const batchedEvent = (auditLogger as any).securityEventBatch[0];
      expect(batchedEvent.id).toBeDefined();
      expect(typeof batchedEvent.id).toBe('string');
      expect(batchedEvent.id.length).toBeGreaterThan(10);
    });

    it('should handle JSON serialization of details object', async () => {
      const complexDetails = {
        requestHeaders: { 'X-Forwarded-For': '192.168.1.1' },
        requestBody: { username: 'admin', password: '***' },
        stackTrace: ['Error at line 1', 'Error at line 2'],
        metadata: { source: 'intrusion-detection', confidence: 0.95 },
      };

      await auditLogger.logSecurityEvent({
        eventType: 'MALICIOUS_REQUEST',
        severity: 'MEDIUM' as const,
        description: 'Potential SQL injection attempt',
        ipAddress: '192.168.1.1',
        details: complexDetails,
      });

      const batchedEvent = (auditLogger as any).securityEventBatch[0];
      expect(batchedEvent.details).toEqual(complexDetails);
    });
  });

  describe('flushBatches', () => {
    it('should write all batched activities and security events to database', async () => {
      mockPrisma.userActivity.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.securityEvent.createMany.mockResolvedValue({ count: 1 });

      // Add some activities and security events to batches
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

      await auditLogger.logSecurityEvent({
        eventType: 'FAILED_LOGIN',
        severity: 'LOW' as const,
        description: 'Failed login attempt',
        ipAddress: '192.168.1.1',
      });

      // Manually flush
      await auditLogger.flushBatches();

      // Should have written to both tables
      expect(mockPrisma.userActivity.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ eventType: 'LOGIN' }),
          expect.objectContaining({ eventType: 'LOGOUT' }),
        ]),
        skipDuplicates: true,
      });

      expect(mockPrisma.securityEvent.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ eventType: 'FAILED_LOGIN' }),
        ]),
        skipDuplicates: true,
      });

      // Batches should be empty after flush
      expect((auditLogger as any).activityBatch).toHaveLength(0);
      expect((auditLogger as any).securityEventBatch).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.userActivity.createMany.mockRejectedValue(dbError);

      await auditLogger.logActivity({
        eventType: 'ERROR' as const,
        ipAddress: '192.168.1.1',
      });

      // Manually flush should not throw
      await expect(auditLogger.flushBatches()).resolves.not.toThrow();

      // Should log the error
      expect(consoleMock.error).toHaveBeenCalledWith(
        'Failed to flush audit batches:',
        dbError
      );
    });

    it('should not attempt database operations when batches are empty', async () => {
      await auditLogger.flushBatches();

      expect(mockPrisma.userActivity.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.securityEvent.createMany).not.toHaveBeenCalled();
    });
  });

  describe('automatic batch flushing', () => {
    it('should flush batches automatically after timeout', async () => {
      vi.useFakeTimers();
      mockPrisma.userActivity.createMany.mockResolvedValue({ count: 1 });

      await auditLogger.logActivity({
        eventType: 'API_ACCESS' as const,
        ipAddress: '192.168.1.1',
      });

      expect(mockPrisma.userActivity.createMany).not.toHaveBeenCalled();

      // Fast-forward time by 5 seconds (default batch timeout)
      vi.advanceTimersByTime(5000);

      // Wait for next tick to allow promise resolution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockPrisma.userActivity.createMany).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('shutdown', () => {
    it('should flush all remaining batches and clear timers', async () => {
      vi.useFakeTimers();
      mockPrisma.userActivity.createMany.mockResolvedValue({ count: 1 });

      await auditLogger.logActivity({
        eventType: 'LOGOUT' as const,
        ipAddress: '192.168.1.1',
        userId: 'user-shutdown-test',
      });

      // Should not have flushed yet
      expect(mockPrisma.userActivity.createMany).not.toHaveBeenCalled();

      // Shutdown should flush immediately
      await auditLogger.shutdown();

      expect(mockPrisma.userActivity.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ 
            eventType: 'LOGOUT',
            userId: 'user-shutdown-test' 
          }),
        ]),
        skipDuplicates: true,
      });

      // Timer should be cleared
      expect((auditLogger as any).batchTimer).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should continue operating after database errors', async () => {
      mockPrisma.userActivity.createMany
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValue({ count: 1 });

      // First activity should fail to flush but not crash
      await auditLogger.logActivity({
        eventType: 'ERROR' as const,
        ipAddress: '192.168.1.1',
      });

      // Force flush to trigger error
      await auditLogger.flushBatches();

      // Should have logged error
      expect(consoleMock.error).toHaveBeenCalled();

      // Should still be able to log more activities
      await auditLogger.logActivity({
        eventType: 'LOGIN' as const,
        ipAddress: '192.168.1.1',
        userId: 'recovery-test',
      });

      await auditLogger.flushBatches();

      // Second flush should succeed
      expect(mockPrisma.userActivity.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ 
            eventType: 'LOGIN',
            userId: 'recovery-test' 
          }),
        ]),
        skipDuplicates: true,
      });
    });
  });
});