import { VerificationAchievementEngine } from '@/lib/achievements/achievementEngine';
import prisma from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  donorCommitment: {
    findMany: jest.fn()
  },
  donorAchievement: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn()
  },
  $disconnect: jest.fn()
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('VerificationAchievementEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateAchievementsForVerifiedResponse', () => {
    it('awards first verified delivery achievement', async () => {
      // Mock donor has 1 verified delivery
      mockPrisma.donorCommitment.findMany
        .mockResolvedValueOnce([
          {
            id: 'commitment-1',
            donorId: 'donor-123',
            status: 'DELIVERED',
            rapidResponse: {
              id: 'response-1',
              verificationStatus: 'VERIFIED',
              data: { personsServed: 10 }
            }
          }
        ])
        .mockResolvedValueOnce([
          {
            id: 'commitment-1',
            donorId: 'donor-123',
            status: 'DELIVERED',
            rapidResponse: {
              id: 'response-1',
              verificationStatus: 'VERIFIED',
              data: { personsServed: 10 }
            }
          }
        ]);

      // No existing achievement
      mockPrisma.donorAchievement.findFirst.mockResolvedValue(null);

      // Mock achievement creation
      const mockAchievement = {
        id: 'ach-1',
        donorId: 'donor-123',
        type: 'FIRST_VERIFIED_DELIVERY',
        title: 'Verified Contributor',
        description: 'Your first delivery has been verified by coordinators',
        earnedAt: new Date(),
        category: 'DELIVERY',
        badgeIcon: '✅'
      };
      mockPrisma.donorAchievement.create.mockResolvedValue(mockAchievement as any);

      const achievements = await VerificationAchievementEngine.calculateAchievementsForVerifiedResponse(
        'donor-123',
        'response-1',
        'verification-1'
      );

      expect(achievements).toHaveLength(1);
      expect(achievements[0].type).toBe('FIRST_VERIFIED_DELIVERY');
      expect(achievements[0].title).toBe('Verified Contributor');
    });

    it('awards verification streak achievement', async () => {
      // Mock donor has 5 consecutive verified deliveries
      const mockCommitments = Array.from({ length: 5 }, (_, i) => ({
        id: `commitment-${i + 1}`,
        donorId: 'donor-123',
        status: 'DELIVERED',
        rapidResponse: {
          id: `response-${i + 1}`,
          verificationStatus: 'VERIFIED',
          data: { personsServed: 10 }
        }
      }));

      mockPrisma.donorCommitment.findMany
        .mockResolvedValueOnce(mockCommitments)
        .mockResolvedValueOnce(mockCommitments);

      // No existing streak achievement
      mockPrisma.donorAchievement.findFirst
        .mockResolvedValueOnce(null) // FIRST_VERIFIED_DELIVERY check
        .mockResolvedValueOnce(null); // VERIFICATION_STREAK_5 check

      // Mock achievement creation
      mockPrisma.donorAchievement.create
        .mockResolvedValueOnce({
          id: 'ach-1',
          type: 'FIRST_VERIFIED_DELIVERY',
          title: 'Verified Contributor'
        } as any)
        .mockResolvedValueOnce({
          id: 'ach-2',
          type: 'VERIFICATION_STREAK_5',
          title: 'Quality Streak'
        } as any);

      const achievements = await VerificationAchievementEngine.calculateAchievementsForVerifiedResponse(
        'donor-123',
        'response-5',
        'verification-5'
      );

      expect(achievements).toHaveLength(2);
      expect(achievements.some(a => a.type === 'VERIFICATION_STREAK_5')).toBe(true);
    });

    it('awards specialization achievement for health responses', async () => {
      // Mock donor has 10 verified health service deliveries
      const mockCommitments = Array.from({ length: 10 }, (_, i) => ({
        id: `commitment-${i + 1}`,
        donorId: 'donor-123',
        status: 'DELIVERED',
        responseType: 'HEALTH_SERVICES',
        rapidResponse: {
          id: `response-${i + 1}`,
          verificationStatus: 'VERIFIED',
          data: { personsServed: 5 }
        }
      }));

      mockPrisma.donorCommitment.findMany
        .mockResolvedValueOnce(mockCommitments)
        .mockResolvedValueOnce(mockCommitments);

      // Mock no existing achievements
      mockPrisma.donorAchievement.findFirst.mockResolvedValue(null);

      // Mock achievement creation
      mockPrisma.donorAchievement.create.mockResolvedValue({
        id: 'ach-health',
        type: 'HEALTH_SPECIALIST',
        title: 'Health Specialist',
        category: 'SPECIALIZATION'
      } as any);

      const achievements = await VerificationAchievementEngine.calculateAchievementsForVerifiedResponse(
        'donor-123',
        'response-10',
        'verification-10'
      );

      expect(achievements.some(a => a.type === 'HEALTH_SPECIALIST')).toBe(true);
    });

    it('awards impact achievement based on beneficiaries helped', async () => {
      // Mock donor has helped 60 people through verified responses
      const mockCommitments = Array.from({ length: 6 }, (_, i) => ({
        id: `commitment-${i + 1}`,
        donorId: 'donor-123',
        status: 'DELIVERED',
        rapidResponse: {
          id: `response-${i + 1}`,
          verificationStatus: 'VERIFIED',
          data: { personsServed: 10 }
        }
      }));

      mockPrisma.donorCommitment.findMany
        .mockResolvedValueOnce(mockCommitments)
        .mockResolvedValueOnce(mockCommitments);

      mockPrisma.donorAchievement.findFirst.mockResolvedValue(null);

      mockPrisma.donorAchievement.create.mockResolvedValue({
        id: 'ach-impact',
        type: 'IMPACT_50_VERIFIED',
        title: 'Community Helper',
        category: 'IMPACT'
      } as any);

      const achievements = await VerificationAchievementEngine.calculateAchievementsForVerifiedResponse(
        'donor-123',
        'response-6',
        'verification-6'
      );

      expect(achievements.some(a => a.type === 'IMPACT_50_VERIFIED')).toBe(true);
    });

    it('does not award existing achievements', async () => {
      // Mock donor has 1 verified delivery
      mockPrisma.donorCommitment.findMany.mockResolvedValue([
        {
          id: 'commitment-1',
          donorId: 'donor-123',
          status: 'DELIVERED',
          rapidResponse: {
            verificationStatus: 'VERIFIED',
            data: { personsServed: 10 }
          }
        }
      ]);

      // Mock existing achievement
      mockPrisma.donorAchievement.findFirst.mockResolvedValue({
        id: 'existing-ach',
        type: 'FIRST_VERIFIED_DELIVERY'
      } as any);

      const achievements = await VerificationAchievementEngine.calculateAchievementsForVerifiedResponse(
        'donor-123',
        'response-1',
        'verification-1'
      );

      expect(achievements).toHaveLength(0);
      expect(mockPrisma.donorAchievement.create).not.toHaveBeenCalled();
    });
  });

  describe('triggerAchievementCalculation', () => {
    it('returns new achievements and total count', async () => {
      const mockNewAchievements = [
        { id: 'ach-1', title: 'First Achievement' }
      ];

      // Mock the private method by mocking the class method
      jest.spyOn(VerificationAchievementEngine, 'calculateAchievementsForVerifiedResponse')
        .mockResolvedValue(mockNewAchievements as any);

      mockPrisma.donorAchievement.count.mockResolvedValue(5);

      const result = await VerificationAchievementEngine.triggerAchievementCalculation(
        'donor-123',
        'response-456',
        'verification-789'
      );

      expect(result.newAchievements).toEqual(mockNewAchievements);
      expect(result.totalAchievements).toBe(5);
    });
  });
});