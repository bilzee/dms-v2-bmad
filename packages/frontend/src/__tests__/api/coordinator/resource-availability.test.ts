import { GET } from '@/app/api/v1/coordinator/resources/available/route';
import { NextRequest } from 'next/server';

// Mock the auth and prisma modules
jest.mock('@/lib/auth/authOptions');
jest.mock('@/lib/prisma');

const mockAuth = require('@/lib/auth/authOptions');
const mockPrisma = require('@/lib/prisma');

describe('Coordinator Resource Availability API', () => {
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

  it('should return resource availability with real data', async () => {
    // Mock realistic resource data
    const mockCommitments = [
      {
        id: 'commitment1',
        donorId: 'donor1',
        quantity: 1000,
        responseType: 'FOOD',
        targetDate: new Date(),
        status: 'DELIVERED',
        donor: { name: 'World Food Programme' },
        incidentId: 'incident1'
      },
      {
        id: 'commitment2',
        donorId: 'donor2',
        quantity: 500,
        responseType: 'WASH',
        targetDate: new Date(),
        status: 'IN_PROGRESS',
        donor: { name: 'UNICEF' },
        incidentId: 'incident1'
      }
    ];

    const mockResponses = [
      {
        id: 'response1',
        responseType: 'FOOD',
        affectedEntityId: 'entity1',
        plannedDate: new Date(),
        data: { quantity: 750, priority: 'HIGH' }
      }
    ];

    const mockAffectedEntities = [
      {
        id: 'entity1',
        name: 'Northern Ward 1',
        type: 'COMMUNITY'
      }
    ];

    mockPrisma.prisma = {
      donorCommitment: {
        findMany: jest.fn().mockResolvedValue(mockCommitments)
      },
      rapidResponse: {
        findMany: jest.fn().mockResolvedValue(mockResponses)
      },
      affectedEntity: {
        findMany: jest.fn().mockResolvedValue(mockAffectedEntities)
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/coordinator/resources/available', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('resources');
    expect(data.data).toHaveProperty('summary');
    expect(Array.isArray(data.data.resources)).toBe(true);
    
    // Verify resource calculations
    const foodResource = data.data.resources.find((r: any) => r.responseType === 'FOOD');
    expect(foodResource).toBeDefined();
    expect(foodResource.totalCommitted).toBe(1000);
    expect(foodResource.totalAllocated).toBe(750);
    expect(foodResource.totalAvailable).toBe(250);
  });

  it('should filter resources by incident ID', async () => {
    const mockCommitments = [
      {
        id: 'commitment1',
        donorId: 'donor1',
        quantity: 1000,
        responseType: 'FOOD',
        targetDate: new Date(),
        status: 'DELIVERED',
        donor: { name: 'World Food Programme' },
        incidentId: 'incident1'
      },
      {
        id: 'commitment2',
        donorId: 'donor2',
        quantity: 500,
        responseType: 'WASH',
        targetDate: new Date(),
        status: 'IN_PROGRESS',
        donor: { name: 'UNICEF' },
        incidentId: 'incident2' // Different incident
      }
    ];

    mockPrisma.prisma = {
      donorCommitment: {
        findMany: jest.fn().mockResolvedValue(mockCommitments)
      },
      rapidResponse: {
        findMany: jest.fn().mockResolvedValue([])
      },
      affectedEntity: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/coordinator/resources/available?incidentId=incident1', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Should only show resources for incident1
    expect(data.data.resources.length).toBeGreaterThan(0);
    data.data.resources.forEach((resource: any) => {
      resource.commitments.forEach((commitment: any) => {
        expect(commitment.incidentId).toBe('incident1');
      });
    });
  });

  it('should filter by response types', async () => {
    const mockCommitments = [
      {
        id: 'commitment1',
        donorId: 'donor1',
        quantity: 1000,
        responseType: 'FOOD',
        targetDate: new Date(),
        status: 'DELIVERED',
        donor: { name: 'World Food Programme' },
        incidentId: 'incident1'
      },
      {
        id: 'commitment2',
        donorId: 'donor2',
        quantity: 500,
        responseType: 'WASH',
        targetDate: new Date(),
        status: 'IN_PROGRESS',
        donor: { name: 'UNICEF' },
        incidentId: 'incident1'
      }
    ];

    mockPrisma.prisma = {
      donorCommitment: {
        findMany: jest.fn().mockResolvedValue(mockCommitments)
      },
      rapidResponse: {
        findMany: jest.fn().mockResolvedValue([])
      },
      affectedEntity: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/coordinator/resources/available?responseTypes=FOOD', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Should only show FOOD resources
    expect(data.data.resources.every((r: any) => r.responseType === 'FOOD')).toBe(true);
  });

  it('should handle resources with shortfalls', async () => {
    const mockCommitments = [
      {
        id: 'commitment1',
        donorId: 'donor1',
        quantity: 500,
        responseType: 'FOOD',
        targetDate: new Date(),
        status: 'DELIVERED',
        donor: { name: 'World Food Programme' },
        incidentId: 'incident1'
      }
    ];

    const mockResponses = [
      {
        id: 'response1',
        responseType: 'FOOD',
        affectedEntityId: 'entity1',
        plannedDate: new Date(),
        data: { quantity: 750, priority: 'HIGH' }
      }
    ];

    mockPrisma.prisma = {
      donorCommitment: {
        findMany: jest.fn().mockResolvedValue(mockCommitments)
      },
      rapidResponse: {
        findMany: jest.fn().mockResolvedValue(mockResponses)
      },
      affectedEntity: {
        findMany: jest.fn().mockResolvedValue([{ id: 'entity1', name: 'Northern Ward 1' }])
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/coordinator/resources/available', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    const foodResource = data.data.resources.find((r: any) => r.responseType === 'FOOD');
    expect(foodResource.projectedShortfall).toBe(250); // 750 needed - 500 committed
    expect(foodResource.totalAvailable).toBe(0); // No available resources
  });

  it('should calculate summary statistics correctly', async () => {
    const mockCommitments = [
      {
        id: 'commitment1',
        donorId: 'donor1',
        quantity: 1000,
        responseType: 'FOOD',
        targetDate: new Date(),
        status: 'DELIVERED',
        donor: { name: 'World Food Programme' },
        incidentId: 'incident1'
      },
      {
        id: 'commitment2',
        donorId: 'donor2',
        quantity: 500,
        responseType: 'WASH',
        targetDate: new Date(),
        status: 'PLANNED',
        donor: { name: 'UNICEF' },
        incidentId: 'incident1'
      }
    ];

    mockPrisma.prisma = {
      donorCommitment: {
        findMany: jest.fn().mockResolvedValue(mockCommitments)
      },
      rapidResponse: {
        findMany: jest.fn().mockResolvedValue([])
      },
      affectedEntity: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/coordinator/resources/available', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    expect(data.data.summary.totalResourceTypes).toBe(2);
    expect(data.data.summary.totalCommitments).toBe(2);
    expect(data.data.summary.totalAllocations).toBe(0);
  });

  it('should handle unauthorized access', async () => {
    mockAuth.auth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/v1/coordinator/resources/available', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.errors).toContain('Unauthorized');
  });

  it('should handle database errors gracefully', async () => {
    mockPrisma.prisma = {
      donorCommitment: {
        findMany: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/coordinator/resources/available', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.errors).toContain('Failed to fetch resource availability');
  });

  it('should include timestamp and filters in response', async () => {
    mockPrisma.prisma = {
      donorCommitment: {
        findMany: jest.fn().mockResolvedValue([])
      },
      rapidResponse: {
        findMany: jest.fn().mockResolvedValue([])
      },
      affectedEntity: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/coordinator/resources/available', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('timestamp');
    expect(data.data).toHaveProperty('filters');
    expect(data.data.filters).toHaveProperty('availableResponseTypes');
    expect(data.data.filters).toHaveProperty('availablePriorities');
  });

  it('should show only shortfalls when requested', async () => {
    const mockCommitments = [
      {
        id: 'commitment1',
        donorId: 'donor1',
        quantity: 1000,
        responseType: 'FOOD',
        targetDate: new Date(),
        status: 'DELIVERED',
        donor: { name: 'World Food Programme' },
        incidentId: 'incident1'
      }
    ];

    const mockResponses = [
      {
        id: 'response1',
        responseType: 'FOOD',
        affectedEntityId: 'entity1',
        plannedDate: new Date(),
        data: { quantity: 750, priority: 'HIGH' }
      },
      {
        id: 'response2',
        responseType: 'WASH',
        affectedEntityId: 'entity2',
        plannedDate: new Date(),
        data: { quantity: 200, priority: 'MEDIUM' }
      }
    ];

    mockPrisma.prisma = {
      donorCommitment: {
        findMany: jest.fn().mockResolvedValue(mockCommitments)
      },
      rapidResponse: {
        findMany: jest.fn().mockResolvedValue(mockResponses)
      },
      affectedEntity: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'entity1', name: 'Northern Ward 1' },
          { id: 'entity2', name: 'Northern Ward 2' }
        ])
      }
    };

    const request = new NextRequest('http://localhost:3000/api/v1/coordinator/resources/available?showShortfalls=true', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Should only show resources with shortfalls (WASH has no commitments)
    const shortfallResources = data.data.resources.filter((r: any) => r.projectedShortfall > 0);
    expect(data.data.resources.every((r: any) => r.projectedShortfall > 0)).toBe(true);
  });
});