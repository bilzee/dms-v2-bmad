import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/donors/achievements/calculate/route';
import { auth } from '@/auth';
import { VerificationAchievementEngine } from '@/lib/achievements/achievementEngine';
import DatabaseService from '@/lib/services/DatabaseService';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/achievements/achievementEngine');
jest.mock('@/lib/services/DatabaseService', () => ({
  __esModule: true,
  default: {
    getUserWithRoles: jest.fn(),
    onResponseVerified: jest.fn(),
    getAchievementsByDonor: jest.fn()
  }
}));

import type { Session } from 'next-auth';
const mockAuth = auth as jest.MockedFunction<any>;
const mockEngine = VerificationAchievementEngine as jest.Mocked<typeof VerificationAchievementEngine>;
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('/api/v1/donors/achievements/calculate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates achievements for verified response', async () => {
    const mockAchievements = [
      {
        id: 'ach-1',
        donorId: 'donor-123',
        type: 'FIRST_VERIFIED_DELIVERY',
        title: 'Verified Contributor',
        description: 'Your first delivery has been verified',
        earnedAt: new Date(),
        category: 'DELIVERY',
        badgeIcon: '✅'
      }
    ] as any[];

    mockAuth.mockResolvedValue({
      user: { id: 'donor-123', role: 'DONOR' }
    } as any);

    // Mock DatabaseService methods
    mockDatabaseService.onResponseVerified.mockResolvedValue(mockAchievements);
    mockDatabaseService.getAchievementsByDonor.mockResolvedValue([mockAchievements[0]]);

    const request = new NextRequest('http://localhost/api/v1/donors/achievements/calculate', {
      method: 'POST',
      body: JSON.stringify({
        responseId: 'response-456',
        verificationId: 'verification-789'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.newAchievements).toHaveLength(1);
    expect(data.data.newAchievements[0].title).toBe('Verified Contributor');
    expect(data.message).toContain('Congratulations! You earned 1 new achievement!');
  });

  it('allows coordinators to calculate achievements for other donors', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'coordinator-123', role: 'COORDINATOR' }
    } as any);

    // Mock DatabaseService.getUserWithRoles for coordinator role check
    mockDatabaseService.getUserWithRoles.mockResolvedValue({
      id: 'coordinator-123',
      roles: [{ name: 'COORDINATOR' }]
    } as any);

    // Mock DatabaseService methods 
    mockDatabaseService.onResponseVerified.mockResolvedValue([]);
    mockDatabaseService.getAchievementsByDonor.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/v1/donors/achievements/calculate', {
      method: 'POST',
      body: JSON.stringify({
        responseId: 'response-456',
        verificationId: 'verification-789',
        donorId: 'other-donor-456'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDatabaseService.onResponseVerified).toHaveBeenCalledWith('response-456');
  });

  it('rejects unauthorized requests', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/v1/donors/achievements/calculate', {
      method: 'POST',
      body: JSON.stringify({
        responseId: 'response-456',
        verificationId: 'verification-789'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Unauthorized');
  });

  it('rejects donors trying to calculate achievements for other donors', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'donor-123', role: 'DONOR' }
    } as any);

    // Mock DatabaseService.getUserWithRoles for donor role check
    mockDatabaseService.getUserWithRoles.mockResolvedValue({
      id: 'donor-123',
      roles: [{ name: 'DONOR' }]
    } as any);

    const request = new NextRequest('http://localhost/api/v1/donors/achievements/calculate', {
      method: 'POST',
      body: JSON.stringify({
        responseId: 'response-456',
        verificationId: 'verification-789',
        donorId: 'other-donor-456'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Insufficient permissions');
  });

  it('validates request parameters', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'donor-123', role: 'DONOR' }
    } as any);

    const request = new NextRequest('http://localhost/api/v1/donors/achievements/calculate', {
      method: 'POST',
      body: JSON.stringify({
        // responseId is missing entirely to trigger validation error
        verificationId: 'verification-789'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Invalid request parameters');
  });

  it('handles engine calculation errors gracefully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'donor-123', role: 'DONOR' }
    } as any);

    mockDatabaseService.onResponseVerified.mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new NextRequest('http://localhost/api/v1/donors/achievements/calculate', {
      method: 'POST',
      body: JSON.stringify({
        responseId: 'response-456',
        verificationId: 'verification-789'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Failed to calculate achievements');
  });

  it('returns appropriate message when no new achievements earned', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'donor-123', role: 'DONOR' }
    } as any);

    mockDatabaseService.onResponseVerified.mockResolvedValue([]);
    mockDatabaseService.getAchievementsByDonor.mockResolvedValue(Array.from({ length: 5 }, (_, i) => ({ id: `ach-${i}` })) as any);

    const request = new NextRequest('http://localhost/api/v1/donors/achievements/calculate', {
      method: 'POST',
      body: JSON.stringify({
        responseId: 'response-456',
        verificationId: 'verification-789'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.achievementsEarned).toBe(0);
    expect(data.message).toBe('Achievement calculation completed - no new achievements earned');
  });
});