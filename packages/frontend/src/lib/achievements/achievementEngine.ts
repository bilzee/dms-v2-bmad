import { DonorAchievement, ResponseType } from '@dms/shared';
import DatabaseService from '@/lib/services/DatabaseService';

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
    const donorStats = await DatabaseService.getDonorVerificationStats(donorId);
    
    // Check each achievement rule
    for (const rule of VERIFICATION_ACHIEVEMENT_RULES) {
      const hasAchievement = await DatabaseService.checkExistingAchievement(donorId, rule.id);
      
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

  // Method moved to DatabaseService

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

  // Method moved to DatabaseService

  private static async createAchievement(
    donorId: string, 
    rule: AchievementRule,
    verificationId: string,
    responseId: string
  ): Promise<DonorAchievement> {
    const achievementData = {
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
    };

    const achievement = await DatabaseService.createVerificationAchievement(achievementData);
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

    const totalAchievements = await DatabaseService.countDonorAchievements(donorId);

    return {
      newAchievements,
      totalAchievements
    };
  }
}