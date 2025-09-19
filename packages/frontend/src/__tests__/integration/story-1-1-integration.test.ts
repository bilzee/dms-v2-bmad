import { NextRequest } from 'next/server';
import { createRoleBasedFilterMiddleware, hasResourceAccess, UserContext } from '@/lib/middleware/role-based-filter';
import CacheService from '@/lib/cache/redis';
import PerformanceMonitor from '@/lib/performance/monitor';
import DatabaseService from '@/lib/services/DatabaseService';

// Mock user contexts for testing
const mockUserContexts: Record<string, UserContext> = {
  ADMIN: {
    userId: 'admin-1',
    userEmail: 'admin@example.com',
    userRole: 'ADMIN',
    isActive: true,
  },
  COORDINATOR: {
    userId: 'coordinator-1',
    userEmail: 'coordinator@example.com',
    userRole: 'COORDINATOR',
    isActive: true,
  },
  ASSESSOR: {
    userId: 'assessor-1',
    userEmail: 'assessor@example.com',
    userRole: 'ASSESSOR',
    isActive: true,
  },
  RESPONDER: {
    userId: 'responder-1',
    userEmail: 'responder@example.com',
    userRole: 'RESPONDER',
    isActive: true,
  },
  VERIFIER: {
    userId: 'verifier-1',
    userEmail: 'verifier@example.com',
    userRole: 'VERIFIER',
    isActive: true,
  },
  DONOR: {
    userId: 'donor-1',
    userEmail: 'donor@example.com',
    userRole: 'DONOR',
    isActive: true,
  },
};

describe('Role-Based Data Filtering', () => {
  describe('User Context Management', () => {
    it('should validate user context structure', () => {
      const adminContext = mockUserContexts.ADMIN;
      
      expect(adminContext.userId).toBeDefined();
      expect(adminContext.userEmail).toBeDefined();
      expect(adminContext.userRole).toBeDefined();
      expect(adminContext.isActive).toBe(true);
    });

    it('should handle different user roles', () => {
      const roles = Object.keys(mockUserContexts);
      
      roles.forEach(role => {
        const context = mockUserContexts[role];
        expect(context.userRole).toBe(role);
      });
    });
  });

  describe('Resource Access Control', () => {
    it('should grant admin full access to all resources', () => {
      const adminContext = mockUserContexts.ADMIN;
      
      expect(hasResourceAccess(adminContext, 'incident')).toBe(true);
      expect(hasResourceAccess(adminContext, 'assessment')).toBe(true);
      expect(hasResourceAccess(adminContext, 'response')).toBe(true);
      expect(hasResourceAccess(adminContext, 'donor')).toBe(true);
    });

    it('should grant coordinator full access to all resources', () => {
      const coordinatorContext = mockUserContexts.COORDINATOR;
      
      expect(hasResourceAccess(coordinatorContext, 'incident')).toBe(true);
      expect(hasResourceAccess(coordinatorContext, 'assessment')).toBe(true);
      expect(hasResourceAccess(coordinatorContext, 'response')).toBe(true);
      expect(hasResourceAccess(coordinatorContext, 'donor')).toBe(true);
    });

    it('should restrict assessor access appropriately', () => {
      const assessorContext = mockUserContexts.ASSESSOR;
      
      expect(hasResourceAccess(assessorContext, 'incident')).toBe(true);
      expect(hasResourceAccess(assessorContext, 'assessment')).toBe(true);
      expect(hasResourceAccess(assessorContext, 'response')).toBe(false); // Should be false
      expect(hasResourceAccess(assessorContext, 'donor')).toBe(false);
    });

    it('should restrict responder access appropriately', () => {
      const responderContext = mockUserContexts.RESPONDER;
      
      expect(hasResourceAccess(responderContext, 'incident')).toBe(true);
      expect(hasResourceAccess(responderContext, 'assessment')).toBe(false);
      expect(hasResourceAccess(responderContext, 'response')).toBe(true);
      expect(hasResourceAccess(responderContext, 'donor')).toBe(false);
    });
  });

  describe('Filter Application', () => {
    it('should apply no restrictions for admin users', () => {
      const adminContext = mockUserContexts.ADMIN;
      const filters = { status: 'ACTIVE', severity: 'SEVERE' };
      
      const result = require('@/lib/middleware/role-based-filter').applyRoleBasedFilters(adminContext, filters);
      
      expect(result).toEqual(filters);
    });

    it('should restrict incident types for assessors', () => {
      const assessorContext = mockUserContexts.ASSESSOR;
      const filters = { type: 'FLOOD' };
      
      const result = require('@/lib/middleware/role-based-filter').applyRoleBasedFilters(assessorContext, filters);
      
      // Should allow FLOOD as it's in the allowed list
      expect(result.type).toBe('FLOOD');
    });

    it('should restrict severity levels for responders', () => {
      const responderContext = mockUserContexts.RESPONDER;
      const filters = { severity: 'MINOR' };
      
      const result = require('@/lib/middleware/role-based-filter').applyRoleBasedFilters(responderContext, filters);
      
      // MINOR should be restricted for responders
      expect(result.severity).toBe('NONEXISTENT_SEVERITY');
    });
  });
});

describe('Redis Caching System', () => {
  beforeAll(async () => {
    // Skip Redis tests if not available
    try {
      await CacheService.getStats();
    } catch (error) {
      console.warn('Redis not available, skipping cache tests');
    }
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve cached data', async () => {
      const key = 'test:basic';
      const value = { message: 'Hello World', timestamp: Date.now() };
      
      await CacheService.set(key, value);
      const retrieved = await CacheService.get(key);
      
      expect(retrieved).toEqual(value);
      
      // Clean up
      await CacheService.invalidate(key);
    });

    it('should handle cache misses gracefully', async () => {
      const result = await CacheService.get('test:nonexistent');
      expect(result).toBeNull();
    });

    it('should respect TTL settings', async () => {
      const key = 'test:ttl';
      const value = { data: 'temporary' };
      
      await CacheService.set(key, value, { ttl: 1 }); // 1 second TTL
      
      // Should be available immediately
      const retrieved = await CacheService.get(key);
      expect(retrieved).toEqual(value);
      
      // Note: We can't easily test TTL expiration in unit tests
      await CacheService.invalidate(key);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific keys', async () => {
      const key = 'test:invalidate';
      const value = { data: 'to be deleted' };
      
      await CacheService.set(key, value);
      expect(await CacheService.get(key)).toEqual(value);
      
      await CacheService.invalidate(key);
      expect(await CacheService.get(key)).toBeNull();
    });

    it('should invalidate by tag patterns', async () => {
      const key1 = 'test:tag1';
      const key2 = 'test:tag2';
      const tag = 'test-group';
      
      await CacheService.set(key1, { data: 'data1' }, { tags: [tag] });
      await CacheService.set(key2, { data: 'data2' }, { tags: [tag] });
      
      expect(await CacheService.get(key1)).toBeTruthy();
      expect(await CacheService.get(key2)).toBeTruthy();
      
      await CacheService.invalidateByTag(tag);
      
      expect(await CacheService.get(key1)).toBeNull();
      expect(await CacheService.get(key2)).toBeNull();
    });
  });
});

describe('Performance Monitoring', () => {
  describe('Request Tracking', () => {
    it('should track request performance metrics', async () => {
      const mockRequest = new NextRequest('https://example.com/api/test', {
        method: 'GET',
        headers: { 'user-agent': 'test-agent' },
      });
      
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });
      
      const duration = 150; // 150ms
      
      await PerformanceMonitor.trackRequest(mockRequest, mockResponse, duration);
      
      const stats = PerformanceMonitor.getPerformanceStats();
      expect(stats.requestStats.totalRequests).toBeGreaterThan(0);
    });

    it('should identify slow requests', async () => {
      const mockRequest = new NextRequest('https://example.com/api/slow', {
        method: 'POST',
      });
      
      const mockResponse = new Response(JSON.stringify({ success: false }), {
        status: 500,
      });
      
      const duration = 3500; // 3.5 seconds (slow)
      
      await PerformanceMonitor.trackRequest(mockRequest, mockResponse, duration);
      
      const stats = PerformanceMonitor.getPerformanceStats();
      expect(stats.requestStats.slowRequests).toBeGreaterThan(0);
    });
  });

  describe('Query Performance Tracking', () => {
    it('should track database query performance', async () => {
      const query = 'SELECT * FROM incidents WHERE status = ?';
      const parameters = ['ACTIVE'];
      const duration = 250;
      
      await PerformanceMonitor.trackQuery(query, parameters, duration, true);
      
      const stats = PerformanceMonitor.getPerformanceStats();
      expect(stats.queryStats.totalQueries).toBeGreaterThan(0);
    });

    it('should track query errors', async () => {
      const query = 'INVALID SQL';
      const parameters = [];
      const duration = 100;
      
      await PerformanceMonitor.trackQuery(query, parameters, duration, false, 'Syntax error');
      
      const stats = PerformanceMonitor.getPerformanceStats();
      expect(stats.queryStats.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Performance Reporting', () => {
    it('should generate performance reports', async () => {
      const report = await require('@/lib/performance/monitor').PerformanceReporter.generateReport();
      
      expect(report.summary).toBeDefined();
      expect(report.apiPerformance).toBeDefined();
      expect(report.databasePerformance).toBeDefined();
      expect(report.systemMetrics).toBeDefined();
      expect(report.cacheMetrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should provide system health assessment', async () => {
      const report = await require('@/lib/performance/monitor').PerformanceReporter.generateReport();
      
      expect(['GOOD', 'WARNING', 'CRITICAL']).toContain(report.summary.systemHealth);
    });
  });
});

describe('Database Integration', () => {
  describe('Connection Pooling', () => {
    it('should use enhanced connection configuration', () => {
      const prisma = DatabaseService.prisma;
      
      // Check if the prisma client has connection configuration
      expect(prisma).toBeDefined();
    });

    it('should maintain connection under load', async () => {
      // Test concurrent database access
      const promises = Array(10).fill(0).map(() => 
        DatabaseService.getIncidents({ limit: 5 })
      );
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(10);
      expect(results.every(result => Array.isArray(result))).toBe(true);
    });
  });

  describe('Index Performance', () => {
    it('should benefit from enhanced indexes', async () => {
      const filters = {
        status: 'ACTIVE',
        severity: 'SEVERE',
        limit: 20,
      };
      
      const startTime = Date.now();
      const results = await DatabaseService.getIncidents(filters);
      const duration = Date.now() - startTime;
      
      expect(Array.isArray(results)).toBe(true);
      
      // Performance check - should complete in reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });
});

describe('Integration Validation', () => {
  describe('End-to-End Flow', () => {
    it('should handle complete request lifecycle with caching', async () => {
      // Simulate a complete request flow
      const mockRequest = new NextRequest('https://example.com/api/v1/incidents', {
        method: 'GET',
        headers: { 'authorization': 'Bearer test-token' },
      });
      
      // Apply role-based filtering
      const middleware = createRoleBasedFilterMiddleware();
      const { userContext, filters } = await middleware(mockRequest);
      
      expect(userContext).toBeDefined();
      expect(filters).toBeDefined();
      
      // Database operation
      const incidents = await DatabaseService.getIncidents(filters);
      expect(Array.isArray(incidents)).toBe(true);
      
      // Cache the results
      const cacheKey = `incidents:${JSON.stringify(filters)}`;
      await CacheService.set(cacheKey, incidents);
      
      // Retrieve from cache
      const cached = await CacheService.get(cacheKey);
      expect(cached).toEqual(incidents);
      
      // Clean up
      await CacheService.invalidate(cacheKey);
    });

    it('should handle performance monitoring integration', async () => {
      const mockRequest = new NextRequest('https://example.com/api/test', {
        method: 'GET',
      });
      
      const mockResponse = new Response('{"success": true}', { status: 200 });
      
      // Simulate middleware
      const duration = 200;
      await PerformanceMonitor.trackRequest(mockRequest, mockResponse, duration);
      
      // Generate performance report
      const report = await require('@/lib/performance/monitor').PerformanceReporter.generateReport();
      
      expect(report.apiPerformance.totalRequests).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication failures gracefully', async () => {
      const mockRequest = new NextRequest('https://example.com/api/protected', {
        method: 'GET',
        // No authorization header
      });
      
      const middleware = createRoleBasedFilterMiddleware();
      const { userContext } = await middleware(mockRequest);
      
      expect(userContext).toBeNull();
    });

    it('should handle cache failures gracefully', async () => {
      // Cache operations should not throw errors
      const key = 'test:error-handling';
      const value = { data: 'test' };
      
      // These should not throw even if Redis is unavailable
      await expect(CacheService.set(key, value)).resolves.not.toThrow();
      await expect(CacheService.get(key)).resolves.not.toThrow();
      await expect(CacheService.invalidate(key)).resolves.not.toThrow();
    });
  });

  describe('Security Validation', () => {
    it('should prevent unauthorized access to restricted data', () => {
      const assessorContext = mockUserContexts.ASSESSOR;
      
      // Should not have access to donor management
      expect(hasResourceAccess(assessorContext, 'donor')).toBe(false);
      
      // Should not have access to response management
      expect(hasResourceAccess(assessorContext, 'response')).toBe(false);
    });

    it('should apply appropriate data filtering for each role', () => {
      const responderContext = mockUserContexts.RESPONDER;
      const filters = { severity: 'MINOR', type: 'EPIDEMIC' };
      
      const result = require('@/lib/middleware/role-based-filter').applyRoleBasedFilters(responderContext, filters);
      
      // MINOR severity should be restricted for responders
      expect(result.severity).not.toBe('MINOR');
      
      // EPIDEMIC should be restricted for responders
      expect(result.type).not.toBe('EPIDEMIC');
    });
  });
});

// Cleanup after all tests
afterAll(async () => {
  await CacheService.disconnect();
  await DatabaseService.disconnect();
});