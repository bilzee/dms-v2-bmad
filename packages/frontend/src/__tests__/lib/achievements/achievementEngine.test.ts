import { VerificationAchievementEngine } from '@/lib/achievements/achievementEngine';
import DatabaseService from '@/lib/services/DatabaseService';

// Mock DatabaseService
jest.mock('@/lib/services/DatabaseService', () => ({
  getDonorVerificationStats: jest.fn(),
  checkExistingAchievement: jest.fn(),
  createVerificationAchievement: jest.fn(),
  countDonorAchievements: jest.fn()
}));

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('VerificationAchievementEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateAchievementsForVerifiedResponse', () => {
    it('awards first verified delivery achievement', async () => {
      // Mock donor verification stats (1 verified delivery)
      const mockStats = {
        totalVerifiedDeliveries: 1,
        totalBeneficiariesHelped: 10,
        verificationRate: 100,
        currentVerificationStreak: 1,
        responseTypeDeliveries: {},
        latestVerification: new Date()
      };
      mockDatabaseService.getDonorVerificationStats.mockResolvedValue(mockStats);

      // No existing achievement
      mockDatabaseService.checkExistingAchievement.mockResolvedValue(false);

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
      mockDatabaseService.createVerificationAchievement.mockResolvedValue(mockAchievement as any);

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
      // Mock donor verification stats (5 consecutive verified deliveries)
      const mockStats = {
        totalVerifiedDeliveries: 5,
        totalBeneficiariesHelped: 50,
        verificationRate: 100,
        currentVerificationStreak: 5,
        responseTypeDeliveries: {},
        latestVerification: new Date()
      };
      mockDatabaseService.getDonorVerificationStats.mockResolvedValue(mockStats);

      // No existing achievements - need to account for all achievement rule checks
      mockDatabaseService.checkExistingAchievement
        .mockResolvedValueOnce(false) // FIRST_VERIFIED_DELIVERY check  
        .mockResolvedValueOnce(false) // VERIFICATION_STREAK_5 check
        .mockResolvedValueOnce(true) // VERIFICATION_STREAK_10 check (already exists)
        .mockResolvedValueOnce(true) // HEALTH_SPECIALIST check (doesn't qualify)
        .mockResolvedValueOnce(true) // WASH_EXPERT check (doesn't qualify) 
        .mockResolvedValueOnce(true) // IMPACT_50_VERIFIED check (already exists)
        .mockResolvedValueOnce(true); // IMPACT_200_VERIFIED check (doesn't qualify)

      // Mock achievement creation - only for the two we expect
      mockDatabaseService.createVerificationAchievement
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
      // Mock donor verification stats (10 verified health service deliveries)
      const mockStats = {
        totalVerifiedDeliveries: 10,
        totalBeneficiariesHelped: 50,
        verificationRate: 100,
        currentVerificationStreak: 10,
        responseTypeDeliveries: {
          HEALTH: Array.from({ length: 10 }, (_, i) => ({ id: `commitment-${i + 1}` }))
        },
        latestVerification: new Date()
      };
      mockDatabaseService.getDonorVerificationStats.mockResolvedValue(mockStats);

      // Mock no existing achievements
      mockDatabaseService.checkExistingAchievement.mockResolvedValue(false);

      // Mock achievement creation
      mockDatabaseService.createVerificationAchievement.mockResolvedValue({
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
      // Mock donor verification stats (helped 60 people through verified responses)
      const mockStats = {
        totalVerifiedDeliveries: 6,
        totalBeneficiariesHelped: 60,
        verificationRate: 100,
        currentVerificationStreak: 6,
        responseTypeDeliveries: {},
        latestVerification: new Date()
      };
      mockDatabaseService.getDonorVerificationStats.mockResolvedValue(mockStats);

      mockDatabaseService.checkExistingAchievement.mockResolvedValue(false);

      mockDatabaseService.createVerificationAchievement.mockResolvedValue({
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
      // Mock donor verification stats (1 verified delivery)
      const mockStats = {
        totalVerifiedDeliveries: 1,
        totalBeneficiariesHelped: 10,
        verificationRate: 100,
        currentVerificationStreak: 1,
        responseTypeDeliveries: {},
        latestVerification: new Date()
      };
      mockDatabaseService.getDonorVerificationStats.mockResolvedValue(mockStats);

      // Mock existing achievement
      mockDatabaseService.checkExistingAchievement.mockResolvedValue(true);

      const achievements = await VerificationAchievementEngine.calculateAchievementsForVerifiedResponse(
        'donor-123',
        'response-1',
        'verification-1'
      );

      expect(achievements).toHaveLength(0);
      expect(mockDatabaseService.createVerificationAchievement).not.toHaveBeenCalled();
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

      mockDatabaseService.countDonorAchievements.mockResolvedValue(5);

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