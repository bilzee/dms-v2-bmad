import { GET } from '@/app/api/v1/dashboard/badges/[role]/route';
import { NextRequest } from 'next/server';

// Mock the auth and prisma modules
jest.mock('@/auth');
jest.mock('@/lib/prisma');

const mockAuth = require('@/auth');
const mockPrisma = require('@/lib/prisma');

describe('Coordinator Dashboard Badges API', () => {
  const mockSession = {
    user: {
      id: 'user1',
      email: 'coordinator@example.com',
      name: 'Test Coordinator'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default auth mock
    mockAuth.auth.mockResolvedValue(mockSession);
  });

  it('should return coordinator badges with real data', async () => {
    // Mock Prisma to return realistic data
    mockPrisma.prisma = {
      rapidAssessment: {
        count: jest.fn()
          .mockResolvedValueOnce(15) // pending assessments
          .mockResolvedValueOnce(20) // today assessments
      },
      incident: {
        count: jest.fn().mockResolvedValue(2) // active incidents
      },
      rapidResponse: {
        count: jest.fn().mockResolvedValue(8) // pending responses
      },
      affectedEntity: {
        count: jest.fn().mockResolvedValue(9) // total locations
      },
      userActivity: {
        count: jest.fn().mockResolvedValue(25) // today activities
      },
      securityEvent: {
        count: jest.fn().mockResolvedValue(3) // security alerts
      },
      user: {
        count: jest.fn().mockResolvedValue(8) // active users
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/dashboard/badges/coordinator', {
      method: 'GET',
    });

    const response = await GET(request, { params: { role: 'coordinator' } });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('assessmentQueue');
    expect(data.data).toHaveProperty('responseQueue');
    expect(data.data).toHaveProperty('activeIncidents');
    expect(data.data).toHaveProperty('totalLocations');
    expect(data.data).toHaveProperty('activeUsers');
    
    // Verify realistic data values
    expect(data.data.assessmentQueue).toBe(15);
    expect(data.data.responseQueue).toBe(8);
    expect(data.data.activeIncidents).toBe(2);
    expect(data.data.totalLocations).toBe(9);
    expect(data.data.activeUsers).toBe(8);
  });

  it('should handle unauthorized access', async () => {
    mockAuth.auth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/v1/dashboard/badges/coordinator', {
      method: 'GET',
    });

    const response = await GET(request, { params: { role: 'coordinator' } });

    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.errors).toContain('Unauthorized');
  });

  it('should handle database errors gracefully', async () => {
    mockPrisma.prisma = {
      rapidAssessment: {
        count: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/dashboard/badges/coordinator', {
      method: 'GET',
    });

    const response = await GET(request, { params: { role: 'coordinator' } });

    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.errors).toContain('Failed to fetch dashboard badges');
  });

  it('should return different data for different roles', async () => {
    // Mock different data for admin role
    mockPrisma.prisma = {
      user: { count: jest.fn().mockResolvedValue(15) },
      securityEvent: { count: jest.fn().mockResolvedValue(5) },
      incident: { count: jest.fn().mockResolvedValue(3) },
      rapidAssessment: { count: jest.fn().mockResolvedValue(45) },
      rapidResponse: { count: jest.fn().mockResolvedValue(30) },
      session: { count: jest.fn().mockResolvedValue(12) },
      systemMetrics: {
        findFirst: jest.fn().mockResolvedValue({
          memoryUsage: 30,
          cpuUsage: 25
        })
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/dashboard/badges/admin', {
      method: 'GET',
    });

    const response = await GET(request, { params: { role: 'admin' } });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('activeUsers');
    expect(data.data).toHaveProperty('securityAlerts');
    expect(data.data).toHaveProperty('systemHealth');
  });

  it('should calculate derived metrics correctly', async () => {
    mockPrisma.prisma = {
      rapidAssessment: {
        count: jest.fn()
          .mockResolvedValueOnce(20) // pending assessments
          .mockResolvedValueOnce(25) // total assessments
      },
      incident: {
        count: jest.fn().mockResolvedValue(2)
      },
      rapidResponse: {
        count: jest.fn().mockResolvedValue(10)
      },
      affectedEntity: {
        count: jest.fn().mockResolvedValue(9)
      },
      userActivity: {
        count: jest.fn().mockResolvedValue(30)
      },
      securityEvent: {
        count: jest.fn().mockResolvedValue(2)
      },
      user: {
        count: jest.fn().mockResolvedValue(8)
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/dashboard/badges/coordinator', {
      method: 'GET',
    });

    const response = await GET(request, { params: { role: 'coordinator' } });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Verify derived calculations
    expect(data.data.assessmentReviews).toBe(Math.floor(20 * 0.3)); // 30% of pending
    expect(data.data.pendingReview).toBe(Math.floor(20 * 0.25)); // 25% of pending
  });

  it('should include timestamp in response', async () => {
    mockPrisma.prisma = {
      rapidAssessment: { count: jest.fn().mockResolvedValue(0) },
      incident: { count: jest.fn().mockResolvedValue(0) },
      rapidResponse: { count: jest.fn().mockResolvedValue(0) },
      affectedEntity: { count: jest.fn().mockResolvedValue(0) },
      userActivity: { count: jest.fn().mockResolvedValue(0) },
      securityEvent: { count: jest.fn().mockResolvedValue(0) },
      user: { count: jest.fn().mockResolvedValue(0) }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/dashboard/badges/coordinator', {
      method: 'GET',
    });

    const response = await GET(request, { params: { role: 'coordinator' } });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('timestamp');
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
  });
});