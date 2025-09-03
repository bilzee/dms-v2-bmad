import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/donors/achievements/calculate/route';
import { auth } from '@/auth';
import { VerificationAchievementEngine } from '@/lib/achievements/achievementEngine';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/achievements/achievementEngine');
jest.mock('@/lib/prisma', () => ({
  user: {
    findUnique: jest.fn()
  },
  $disconnect: jest.fn()
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockEngine = VerificationAchievementEngine as jest.Mocked<typeof VerificationAchievementEngine>;

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

    mockEngine.triggerAchievementCalculation.mockResolvedValue({
      newAchievements: mockAchievements,
      totalAchievements: 1
    });

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

    require('@/lib/prisma').user.findUnique.mockResolvedValue({
      id: 'coordinator-123',
      role: 'COORDINATOR'
    });

    mockEngine.triggerAchievementCalculation.mockResolvedValue({
      newAchievements: [],
      totalAchievements: 5
    });

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
    expect(mockEngine.triggerAchievementCalculation).toHaveBeenCalledWith(
      'other-donor-456',
      'response-456',
      'verification-789'
    );
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

    require('@/lib/prisma').user.findUnique.mockResolvedValue({
      id: 'donor-123',
      role: 'DONOR'
    });

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
        responseId: '', // Invalid empty string
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

    mockEngine.triggerAchievementCalculation.mockRejectedValue(
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

    mockEngine.triggerAchievementCalculation.mockResolvedValue({
      newAchievements: [],
      totalAchievements: 5
    });

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