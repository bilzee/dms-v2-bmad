// app/api/v1/admin/audit/activity/__tests__/route.test.ts

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getToken } from 'next-auth/jwt';
import { mockDeep } from 'vitest-mock-extended';

// Mock Next Auth
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

// Mock Prisma
const mockPrisma = mockDeep<any>();
vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

const mockGetToken = getToken as Mock;

describe('Audit Activity API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default to successful auth
    mockGetToken.mockResolvedValue({
      sub: 'admin-user-123',
      email: 'admin@test.com',
      roles: ['ADMIN'],
    });

    // Default Prisma responses
    mockPrisma.userActivity.findMany.mockResolvedValue([
      {
        id: '1',
        userId: 'user-123',
        eventType: 'LOGIN',
        module: 'auth',
        endpoint: '/api/auth/login',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test',
        statusCode: 200,
        responseTime: 150,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        errorMessage: null,
        details: null,
        userEmail: 'user@test.com',
      },
      {
        id: '2',
        userId: 'user-456',
        eventType: 'API_ACCESS',
        module: 'incidents',
        endpoint: '/api/incidents',
        ipAddress: '192.168.1.2',
        userAgent: 'API Client',
        statusCode: 200,
        responseTime: 85,
        timestamp: new Date('2024-01-01T10:01:00Z'),
        errorMessage: null,
        details: null,
        userEmail: 'user2@test.com',
      },
    ]);

    mockPrisma.userActivity.count.mockResolvedValue(125);
    
    mockPrisma.userActivity.groupBy.mockResolvedValue([
      { eventType: 'LOGIN', _count: { eventType: 45 } },
      { eventType: 'API_ACCESS', _count: { eventType: 65 } },
      { eventType: 'LOGOUT', _count: { eventType: 15 } },
    ]);
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 when user does not have admin role', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'regular-user-123',
        email: 'user@test.com',
        roles: ['USER'],
      });

      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Access denied');
    });

    it('should return 403 when user has no roles', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-123',
        email: 'user@test.com',
        roles: null,
      });

      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should allow access for admin users', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Query Parameter Parsing', () => {
    it('should handle search parameter', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?search=login');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { eventType: { contains: 'login', mode: 'insensitive' } },
              { userId: { contains: 'login', mode: 'insensitive' } },
              { module: { contains: 'login', mode: 'insensitive' } },
              { endpoint: { contains: 'login', mode: 'insensitive' } },
              { ipAddress: { contains: 'login', mode: 'insensitive' } },
            ])
          })
        })
      );
    });

    it('should handle userId filter', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?userId=user-123');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123'
          })
        })
      );
    });

    it('should handle eventType filter', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?eventType=LOGIN');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventType: 'LOGIN'
          })
        })
      );
    });

    it('should handle module filter', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?module=auth');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            module: 'auth'
          })
        })
      );
    });

    it('should handle time range filters', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?timeRange=7d');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: expect.any(Date)
            }
          })
        })
      );
    });

    it('should handle custom date range', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';
      const request = new NextRequest(`http://localhost/api/v1/admin/audit/activity?dateFrom=${fromDate}&dateTo=${toDate}`);
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: new Date('2024-01-01T00:00:00.000Z'),
              lte: new Date('2024-01-31T23:59:59.999Z')
            }
          })
        })
      );
    });

    it('should handle pagination parameters', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?page=2&limit=25');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25, // (page - 1) * limit = (2 - 1) * 25
          take: 25
        })
      );
    });

    it('should handle sorting parameters', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?sortBy=eventType&sortOrder=asc');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { eventType: 'asc' }
        })
      );
    });

    it('should use default sorting when not specified', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'desc' }
        })
      );
    });

    it('should enforce maximum limit of 1000', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?limit=5000');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000 // Should be capped at 1000
        })
      );
    });
  });

  describe('Response Data Structure', () => {
    it('should return activities with correct structure', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        data: {
          activities: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              userId: 'user-123',
              eventType: 'LOGIN',
              module: 'auth',
              endpoint: '/api/auth/login',
              ipAddress: '192.168.1.1',
              timestamp: '2024-01-01T10:00:00.000Z',
            }),
          ]),
          totalCount: 125,
          aggregations: expect.objectContaining({
            byEventType: expect.arrayContaining([
              { eventType: 'LOGIN', count: 45 },
              { eventType: 'API_ACCESS', count: 65 },
              { eventType: 'LOGOUT', count: 15 },
            ])
          })
        },
        message: 'User activities retrieved successfully',
        timestamp: expect.any(String)
      });
    });

    it('should include aggregations when requested', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?includeAggregations=true');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.aggregations).toBeDefined();
      expect(data.data.aggregations.byEventType).toHaveLength(3);
    });

    it('should exclude aggregations when not requested', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?includeAggregations=false');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.aggregations).toBeUndefined();
    });

    it('should handle empty results', async () => {
      mockPrisma.userActivity.findMany.mockResolvedValue([]);
      mockPrisma.userActivity.count.mockResolvedValue(0);
      mockPrisma.userActivity.groupBy.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.activities).toEqual([]);
      expect(data.data.totalCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.userActivity.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to retrieve user activities');
    });

    it('should handle auth errors gracefully', async () => {
      mockGetToken.mockRejectedValue(new Error('Auth service unavailable'));

      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication error');
    });

    it('should handle malformed query parameters', async () => {
      // Test with invalid date
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?dateFrom=invalid-date');
      const response = await GET(request);
      
      // Should not crash and should use defaults or skip invalid parameters
      expect(response.status).toBe(200);
    });

    it('should handle negative pagination values', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?page=-1&limit=-5');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // Should default to 0
          take: 50 // Should default to 50
        })
      );
    });
  });

  describe('Time Range Calculations', () => {
    it('should calculate 1 hour time range correctly', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?timeRange=1h');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: new Date('2024-01-01T11:00:00Z')
            }
          })
        })
      );
    });

    it('should calculate 7 days time range correctly', async () => {
      const now = new Date('2024-01-08T12:00:00Z');
      vi.setSystemTime(now);

      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?timeRange=7d');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: new Date('2024-01-01T12:00:00Z')
            }
          })
        })
      );
    });

    it('should handle invalid time range gracefully', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity?timeRange=invalid');
      const response = await GET(request);

      // Should not crash and should return results without time filter
      expect(response.status).toBe(200);
    });
  });

  describe('Database Query Optimization', () => {
    it('should include user email when available', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      await GET(request);

      expect(mockPrisma.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            userEmail: true
          })
        })
      );
    });

    it('should limit fields in select query for performance', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      await GET(request);

      const selectFields = mockPrisma.userActivity.findMany.mock.calls[0][0].select;
      expect(selectFields).toEqual({
        id: true,
        userId: true,
        eventType: true,
        module: true,
        endpoint: true,
        ipAddress: true,
        userAgent: true,
        statusCode: true,
        responseTime: true,
        timestamp: true,
        errorMessage: true,
        details: true,
        userEmail: true,
      });
    });

    it('should run count and data queries in parallel', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/audit/activity');
      await GET(request);

      // Both queries should have been called
      expect(mockPrisma.userActivity.findMany).toHaveBeenCalled();
      expect(mockPrisma.userActivity.count).toHaveBeenCalled();
    });
  });
});