import { DonorAchievement, ResponseType } from '@dms/shared';
import prisma from '@/lib/prisma';

export interface AchievementRule {
  id: string;
  name: string;
  type: 'DELIVERY_MILESTONE' | 'VERIFICATION_SUCCESS' | 'IMPACT_ACHIEVEMENT' | 'RESPONSE_SPECIALIZATION';
  trigger: 'RESPONSE_VERIFIED' | 'COMMITMENT_DELIVERED' | 'PERFORMANCE_THRESHOLD';
  conditions: {
    deliveryCount?: number;
    verificationRate?: number;
    responseTypes?: ResponseType[];
    beneficiariesHelped?: number;
    timeframe?: number;
  };
  badge: {
    title: string;
    description: string;
    icon: string;
    color: string;
  };
}

const VERIFICATION_ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    id: 'FIRST_VERIFIED_DELIVERY',
    name: 'First Verified Delivery',
    type: 'DELIVERY_MILESTONE',
    trigger: 'RESPONSE_VERIFIED',
    conditions: { deliveryCount: 1 },
    badge: {
      title: 'Verified Contributor',
      description: 'Your first delivery has been verified by coordinators',
      icon: '✅',
      color: '#22c55e'
    }
  },
  {
    id: 'VERIFICATION_STREAK_5',
    name: 'Verification Streak - 5',
    type: 'VERIFICATION_SUCCESS',
    trigger: 'RESPONSE_VERIFIED',
    conditions: { deliveryCount: 5, verificationRate: 100 },
    badge: {
      title: 'Quality Streak',
      description: '5 consecutive verified deliveries',
      icon: '🔥',
      color: '#3b82f6'
    }
  },
  {
    id: 'VERIFICATION_STREAK_10',
    name: 'Verification Streak - 10',
    type: 'VERIFICATION_SUCCESS',
    trigger: 'RESPONSE_VERIFIED',
    conditions: { deliveryCount: 10, verificationRate: 100 },
    badge: {
      title: 'Excellence Champion',
      description: '10 consecutive verified deliveries',
      icon: '⭐',
      color: '#f59e0b'
    }
  },
  {
    id: 'HEALTH_SPECIALIST',
    name: 'Health Response Specialist',
    type: 'RESPONSE_SPECIALIZATION',
    trigger: 'RESPONSE_VERIFIED',
    conditions: { 
      deliveryCount: 10, 
      responseTypes: ['HEALTH'],
      verificationRate: 80 
    },
    badge: {
      title: 'Health Specialist',
      description: '10+ verified health service deliveries',
      icon: '🏥',
      color: '#8b5cf6'
    }
  },
  {
    id: 'WASH_EXPERT',
    name: 'WASH Expert',
    type: 'RESPONSE_SPECIALIZATION',
    trigger: 'RESPONSE_VERIFIED',
    conditions: { 
      deliveryCount: 10, 
      responseTypes: ['WASH'],
      verificationRate: 80 
    },
    badge: {
      title: 'WASH Expert',
      description: '10+ verified WASH deliveries',
      icon: '💧',
      color: '#8b5cf6'
    }
  },
  {
    id: 'IMPACT_50_VERIFIED',
    name: 'Verified Impact - 50',
    type: 'IMPACT_ACHIEVEMENT',
    trigger: 'RESPONSE_VERIFIED',
    conditions: { beneficiariesHelped: 50 },
    badge: {
      title: 'Community Helper',
      description: 'Helped 50+ people through verified deliveries',
      icon: '🤝',
      color: '#f59e0b'
    }
  },
  {
    id: 'IMPACT_200_VERIFIED',
    name: 'Verified Impact - 200',
    type: 'IMPACT_ACHIEVEMENT',
    trigger: 'RESPONSE_VERIFIED',
    conditions: { beneficiariesHelped: 200 },
    badge: {
      title: 'Impact Champion',
      description: 'Helped 200+ people through verified deliveries',
      icon: '🏆',
      color: '#f59e0b'
    }
  }
];

export class VerificationAchievementEngine {
  
  static async calculateAchievementsForVerifiedResponse(
    donorId: string, 
    responseId: string,
    verificationId: string
  ): Promise<DonorAchievement[]> {
    const newAchievements: DonorAchievement[] = [];

    // Get donor's verification statistics
    const donorStats = await this.getDonorVerificationStats(donorId);
    
    // Check each achievement rule
    for (const rule of VERIFICATION_ACHIEVEMENT_RULES) {
      const hasAchievement = await this.checkExistingAchievement(donorId, rule.id);
      
      if (!hasAchievement && this.evaluateRule(rule, donorStats)) {
        const achievement = await this.createAchievement(
          donorId, 
          rule, 
          verificationId, 
          responseId
        );
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  private static async getDonorVerificationStats(donorId: string) {
    // Get all verified responses linked to this donor
    const verifiedCommitments = await prisma.donorCommitment.findMany({
      where: {
        donorId,
        status: 'DELIVERED'
      },
      include: {
        rapidResponse: {
          where: { verificationStatus: 'VERIFIED' }
        }
      },
      orderBy: { deliveredDate: 'desc' }
    });

    const verifiedDeliveries = verifiedCommitments.filter(c => c.rapidResponse);
    
    // Calculate beneficiaries helped through verified responses
    const totalBeneficiaries = verifiedDeliveries.reduce((total, commitment) => {
      if (commitment.rapidResponse?.data) {
        const responseData = commitment.rapidResponse.data as any;
        if (responseData.personsServed) total += responseData.personsServed;
        if (responseData.householdsServed) total += responseData.householdsServed * 4;
      }
      return total;
    }, 0);

    // Group by response type for specialization tracking
    const responseTypeGroups = verifiedDeliveries.reduce((groups, commitment) => {
      const responseType = commitment.responseType;
      if (!groups[responseType]) groups[responseType] = [];
      groups[responseType].push(commitment);
      return groups;
    }, {} as Record<string, any[]>);

    // Calculate verification streak (consecutive verified deliveries)
    let currentStreak = 0;
    const allCommitments = await prisma.donorCommitment.findMany({
      where: { donorId, status: 'DELIVERED' },
      include: { rapidResponse: true },
      orderBy: { deliveredDate: 'desc' }
    });

    for (const commitment of allCommitments) {
      if (commitment.rapidResponse?.verificationStatus === 'VERIFIED') {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalVerifiedDeliveries: verifiedDeliveries.length,
      totalBeneficiariesHelped: totalBeneficiaries,
      verificationRate: allCommitments.length > 0 
        ? (verifiedDeliveries.length / allCommitments.length) * 100 
        : 0,
      currentVerificationStreak: currentStreak,
      responseTypeDeliveries: responseTypeGroups,
      latestVerification: verifiedDeliveries[0]?.rapidResponse?.updatedAt
    };
  }

  private static evaluateRule(rule: AchievementRule, stats: any): boolean {
    const { conditions } = rule;

    // Check delivery count
    if (conditions.deliveryCount && stats.totalVerifiedDeliveries < conditions.deliveryCount) {
      return false;
    }

    // Check verification rate
    if (conditions.verificationRate && stats.verificationRate < conditions.verificationRate) {
      return false;
    }

    // Check beneficiaries helped
    if (conditions.beneficiariesHelped && stats.totalBeneficiariesHelped < conditions.beneficiariesHelped) {
      return false;
    }

    // Check response type specialization
    if (conditions.responseTypes) {
      for (const responseType of conditions.responseTypes) {
        const typeDeliveries = stats.responseTypeDeliveries[responseType] || [];
        if (typeDeliveries.length < (conditions.deliveryCount || 1)) {
          return false;
        }
      }
    }

    // Check verification streak for consecutive achievements
    if (rule.type === 'VERIFICATION_SUCCESS' && conditions.deliveryCount) {
      if (stats.currentVerificationStreak < conditions.deliveryCount) {
        return false;
      }
    }

    return true;
  }

  private static async checkExistingAchievement(donorId: string, ruleId: string): Promise<boolean> {
    const existing = await prisma.donorAchievement.findFirst({
      where: {
        donorId,
        type: ruleId
      }
    });
    return !!existing;
  }

  private static async createAchievement(
    donorId: string, 
    rule: AchievementRule,
    verificationId: string,
    responseId: string
  ): Promise<DonorAchievement> {
    const achievement = await prisma.donorAchievement.create({
      data: {
        donorId,
        type: rule.id,
        title: rule.badge.title,
        description: rule.badge.description,
        category: rule.type === 'DELIVERY_MILESTONE' ? 'DELIVERY' :
                 rule.type === 'VERIFICATION_SUCCESS' ? 'CONSISTENCY' :
                 rule.type === 'IMPACT_ACHIEVEMENT' ? 'IMPACT' : 'SPECIALIZATION',
        progress: 100,
        isUnlocked: true,
        unlockedAt: new Date(),
        verificationId,
        responseId,
        badgeIcon: rule.badge.icon,
        badgeColor: rule.badge.color
      }
    });

    return achievement as DonorAchievement;
  }

  static async triggerAchievementCalculation(
    donorId: string,
    responseId: string,
    verificationId: string
  ): Promise<{ 
    newAchievements: DonorAchievement[];
    totalAchievements: number;
  }> {
    const newAchievements = await this.calculateAchievementsForVerifiedResponse(
      donorId,
      responseId,
      verificationId
    );

    const totalAchievements = await prisma.donorAchievement.count({
      where: { donorId, isUnlocked: true }
    });

    return {
      newAchievements,
      totalAchievements
    };
  }
}