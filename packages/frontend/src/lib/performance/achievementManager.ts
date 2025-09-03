/**
 * Achievement System Integration
 * 
 * This module handles:
 * - Achievement milestone detection
 * - Badge awarding logic
 * - Performance score calculation
 * - Real-time achievement notifications
 */

import { statusTracker, PerformanceEvent } from './statusTracker';

export interface AchievementRule {
  id: string;
  type: string;
  title: string;
  description: string;
  category: 'delivery' | 'accuracy' | 'impact' | 'consistency';
  badgeIcon: string;
  requirements: {
    metric: string;
    operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
    value: number;
    timeframe?: string; // '30d', '90d', '1y', 'all'
    consecutive?: boolean;
  };
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  prerequisites?: string[]; // Other achievement IDs that must be completed first
}

export interface DonorStats {
  donorId: string;
  totalCommitments: number;
  completedDeliveries: number;
  onTimeDeliveries: number;
  accurateQuantityDeliveries: number;
  totalBeneficiariesHelped: number;
  consecutiveOnTimeDeliveries: number;
  consecutiveAccurateDeliveries: number;
  perfectPerformanceStreak: number;
  responseTypesServed: string[];
  locationsServed: string[];
  averageResponseTime: number;
  verificationRate: number;
  lastDeliveryDate?: Date;
  joinedDate: Date;
}

// Achievement rules configuration
const ACHIEVEMENT_RULES: AchievementRule[] = [
  // First Steps
  {
    id: 'first_commitment',
    type: 'FIRST_COMMITMENT',
    title: 'First Step',
    description: 'Made your first donation commitment',
    category: 'delivery',
    badgeIcon: '🌟',
    requirements: { metric: 'totalCommitments', operator: 'gte', value: 1 },
    points: 10,
    tier: 'bronze',
  },
  {
    id: 'first_delivery',
    type: 'FIRST_DELIVERY',
    title: 'First Delivery',
    description: 'Completed your first verified delivery to help those in need',
    category: 'delivery',
    badgeIcon: '🎯',
    requirements: { metric: 'completedDeliveries', operator: 'gte', value: 1 },
    points: 25,
    tier: 'bronze',
    prerequisites: ['first_commitment'],
  },

  // Delivery Milestones
  {
    id: 'milestone_5',
    type: 'MILESTONE_5',
    title: '5 Deliveries',
    description: 'Completed 5 verified deliveries',
    category: 'delivery',
    badgeIcon: '🏅',
    requirements: { metric: 'completedDeliveries', operator: 'gte', value: 5 },
    points: 50,
    tier: 'bronze',
  },
  {
    id: 'milestone_10',
    type: 'MILESTONE_10',
    title: '10 Deliveries Milestone',
    description: 'Successfully completed 10 verified deliveries',
    category: 'delivery',
    badgeIcon: '📦',
    requirements: { metric: 'completedDeliveries', operator: 'gte', value: 10 },
    points: 100,
    tier: 'silver',
  },
  {
    id: 'milestone_25',
    type: 'MILESTONE_25',
    title: '25 Deliveries Champion',
    description: 'Reached the milestone of 25 completed deliveries',
    category: 'delivery',
    badgeIcon: '🏆',
    requirements: { metric: 'completedDeliveries', operator: 'gte', value: 25 },
    points: 250,
    tier: 'gold',
  },

  // Accuracy Achievements
  {
    id: 'perfect_accuracy_3',
    type: 'PERFECT_ACCURACY_3',
    title: 'Precision Pro',
    description: 'Achieved 100% quantity accuracy for 3 consecutive deliveries',
    category: 'accuracy',
    badgeIcon: '🎯',
    requirements: { metric: 'consecutiveAccurateDeliveries', operator: 'gte', value: 3 },
    points: 75,
    tier: 'silver',
  },
  {
    id: 'perfect_accuracy_5',
    type: 'PERFECT_ACCURACY',
    title: 'Perfect Accuracy',
    description: 'Achieved 100% quantity accuracy for 5 consecutive deliveries',
    category: 'accuracy',
    badgeIcon: '💯',
    requirements: { metric: 'consecutiveAccurateDeliveries', operator: 'gte', value: 5 },
    points: 150,
    tier: 'gold',
  },

  // Timeliness Achievements
  {
    id: 'rapid_responder',
    type: 'RAPID_RESPONDER',
    title: 'Rapid Responder',
    description: 'Delivered 5 commitments within 24 hours of pledging',
    category: 'delivery',
    badgeIcon: '⚡',
    requirements: { metric: 'averageResponseTime', operator: 'lte', value: 24 },
    points: 100,
    tier: 'silver',
  },
  {
    id: 'on_time_streak_5',
    type: 'ON_TIME_STREAK_5',
    title: 'Reliable Delivery',
    description: 'Delivered on time for 5 consecutive commitments',
    category: 'delivery',
    badgeIcon: '⏰',
    requirements: { metric: 'consecutiveOnTimeDeliveries', operator: 'gte', value: 5 },
    points: 125,
    tier: 'silver',
  },

  // Impact Achievements
  {
    id: 'impact_100',
    type: 'IMPACT_100',
    title: 'Community Helper',
    description: 'Your deliveries have helped 100 beneficiaries',
    category: 'impact',
    badgeIcon: '🤝',
    requirements: { metric: 'totalBeneficiariesHelped', operator: 'gte', value: 100 },
    points: 200,
    tier: 'silver',
  },
  {
    id: 'impact_500',
    type: 'IMPACT_500',
    title: 'Life Changer',
    description: 'Your contributions have positively impacted 500 lives',
    category: 'impact',
    badgeIcon: '❤️',
    requirements: { metric: 'totalBeneficiariesHelped', operator: 'gte', value: 500 },
    points: 500,
    tier: 'gold',
  },
  {
    id: 'impact_1000',
    type: 'HIGH_IMPACT',
    title: 'High Impact Helper',
    description: 'Your deliveries have helped over 1,000 beneficiaries',
    category: 'impact',
    badgeIcon: '🌟',
    requirements: { metric: 'totalBeneficiariesHelped', operator: 'gte', value: 1000 },
    points: 1000,
    tier: 'platinum',
  },

  // Consistency Achievements
  {
    id: 'monthly_contributor',
    type: 'MONTHLY_CONTRIBUTOR',
    title: 'Monthly Contributor',
    description: 'Made at least one delivery every month for 3 consecutive months',
    category: 'consistency',
    badgeIcon: '📅',
    requirements: { metric: 'perfectPerformanceStreak', operator: 'gte', value: 3, timeframe: '90d' },
    points: 300,
    tier: 'gold',
  },
  {
    id: 'consistency_champion',
    type: 'CONSISTENCY_CHAMPION',
    title: 'Consistency Champion',
    description: 'Maintained 90%+ performance score for 3 months',
    category: 'consistency',
    badgeIcon: '🏆',
    requirements: { metric: 'perfectPerformanceStreak', operator: 'gte', value: 90, timeframe: '90d' },
    points: 400,
    tier: 'platinum',
  },

  // Diversity Achievements
  {
    id: 'versatile_helper',
    type: 'VERSATILE_HELPER',
    title: 'Versatile Helper',
    description: 'Delivered across 3 different response types',
    category: 'delivery',
    badgeIcon: '🎨',
    requirements: { metric: 'responseTypesServed', operator: 'gte', value: 3 },
    points: 150,
    tier: 'silver',
  },
  {
    id: 'geographic_reach',
    type: 'GEOGRAPHIC_REACH',
    title: 'Wide Reach',
    description: 'Served communities in 5 different locations',
    category: 'delivery',
    badgeIcon: '🗺️',
    requirements: { metric: 'locationsServed', operator: 'gte', value: 5 },
    points: 200,
    tier: 'gold',
  },
];

class AchievementManager {
  private rules: Map<string, AchievementRule> = new Map();
  
  constructor() {
    this.initializeRules();
    this.setupEventListeners();
  }

  private initializeRules() {
    ACHIEVEMENT_RULES.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  private setupEventListeners() {
    // Listen for performance events that might trigger achievements
    statusTracker.addEventListener(PerformanceEvent.COMMITMENT_DELIVERED, this.checkAchievements.bind(this));
    statusTracker.addEventListener(PerformanceEvent.COMMITMENT_VERIFIED, this.checkAchievements.bind(this));
    statusTracker.addEventListener(PerformanceEvent.COMMITMENT_CREATED, this.checkAchievements.bind(this));
  }

  /**
   * Check for new achievements based on donor stats
   */
  async checkAchievements(eventData: any) {
    try {
      // Fetch current donor stats
      const stats = await this.fetchDonorStats(eventData.donorId);
      
      // Get already earned achievements
      const earnedAchievements = await this.fetchEarnedAchievements(eventData.donorId);
      const earnedIds = new Set(earnedAchievements.map((a: any) => a.type));

      // Check each rule
      for (const rule of this.rules.values()) {
        if (earnedIds.has(rule.type)) continue; // Already earned
        
        if (await this.meetsRequirements(stats, rule, earnedIds)) {
          await this.awardAchievement(eventData.donorId, rule);
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  /**
   * Check if donor meets achievement requirements
   */
  private async meetsRequirements(
    stats: DonorStats, 
    rule: AchievementRule, 
    earnedAchievements: Set<string>
  ): Promise<boolean> {
    // Check prerequisites
    if (rule.prerequisites) {
      const prerequisitesMet = rule.prerequisites.every(prereq => {
        const prereqRule = this.rules.get(prereq);
        return prereqRule && earnedAchievements.has(prereqRule.type);
      });
      if (!prerequisitesMet) return false;
    }

    // Get the metric value
    const metricValue = this.getMetricValue(stats, rule.requirements.metric);
    const targetValue = rule.requirements.value;

    // Apply operator logic
    switch (rule.requirements.operator) {
      case 'gte': return metricValue >= targetValue;
      case 'lte': return metricValue <= targetValue;
      case 'gt': return metricValue > targetValue;
      case 'lt': return metricValue < targetValue;
      case 'eq': return metricValue === targetValue;
      default: return false;
    }
  }

  /**
   * Get metric value from donor stats
   */
  private getMetricValue(stats: DonorStats, metric: string): number {
    switch (metric) {
      case 'totalCommitments': return stats.totalCommitments;
      case 'completedDeliveries': return stats.completedDeliveries;
      case 'onTimeDeliveries': return stats.onTimeDeliveries;
      case 'accurateQuantityDeliveries': return stats.accurateQuantityDeliveries;
      case 'totalBeneficiariesHelped': return stats.totalBeneficiariesHelped;
      case 'consecutiveOnTimeDeliveries': return stats.consecutiveOnTimeDeliveries;
      case 'consecutiveAccurateDeliveries': return stats.consecutiveAccurateDeliveries;
      case 'perfectPerformanceStreak': return stats.perfectPerformanceStreak;
      case 'responseTypesServed': return stats.responseTypesServed.length;
      case 'locationsServed': return stats.locationsServed.length;
      case 'averageResponseTime': return stats.averageResponseTime;
      case 'verificationRate': return stats.verificationRate;
      default: return 0;
    }
  }

  /**
   * Award achievement to donor
   */
  private async awardAchievement(donorId: string, rule: AchievementRule) {
    try {
      // Create achievement in database via API
      const response = await fetch('/api/v1/donors/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donorId,
          type: rule.type,
          title: rule.title,
          description: rule.description,
          category: rule.category,
          progress: 100,
          isUnlocked: true,
          unlockedAt: new Date(),
        }),
      });

      if (response.ok) {
        const achievementData = await response.json();
        
        // Emit achievement event
        statusTracker.emitEvent({
          event: PerformanceEvent.PERFORMANCE_MILESTONE,
          commitmentId: '',
          donorId,
          timestamp: new Date(),
          metadata: {
            achievementUnlocked: achievementData.data,
            points: rule.points,
            tier: rule.tier,
          },
        });

        console.log(`🎉 Achievement unlocked: ${rule.title} for donor ${donorId}`);
        
        // Trigger UI update
        const achievementEvent = new CustomEvent('donor-achievement-unlocked', {
          detail: { donorId, achievement: achievementData.data }
        });
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(achievementEvent);
        }
      }

    } catch (error) {
      console.error('Error awarding achievement:', error);
    }
  }

  /**
   * Calculate performance score with achievement bonuses
   */
  calculatePerformanceScore(
    baseMetrics: {
      onTimeDeliveryRate: number;
      quantityAccuracyRate: number;
      impactScore: number;
    },
    achievements: Array<{ type: string; points: number }>
  ): number {
    // Base performance score (0-90)
    const baseScore = (
      baseMetrics.onTimeDeliveryRate * 0.35 +
      baseMetrics.quantityAccuracyRate * 0.35 +
      baseMetrics.impactScore * 0.30
    ) * 0.90;

    // Achievement bonus (0-10 points)
    const totalAchievementPoints = achievements.reduce((sum, a) => sum + a.points, 0);
    const achievementBonus = Math.min(totalAchievementPoints / 100, 10); // Max 10 bonus points

    return Math.min(baseScore + achievementBonus, 100);
  }

  /**
   * Get achievement progress for next unlockable achievements
   */
  async getAchievementProgress(donorId: string) {
    try {
      const stats = await this.fetchDonorStats(donorId);
      const earnedAchievements = await this.fetchEarnedAchievements(donorId);
      const earnedIds = new Set(earnedAchievements.map((a: any) => a.type));

      const progress = [];

      for (const rule of this.rules.values()) {
        if (earnedIds.has(rule.type)) continue;

        // Check if prerequisites are met
        let prerequisitesMet = true;
        if (rule.prerequisites) {
          prerequisitesMet = rule.prerequisites.every(prereq => {
            const prereqRule = this.rules.get(prereq);
            return prereqRule && earnedIds.has(prereqRule.type);
          });
        }

        if (!prerequisitesMet) continue;

        const currentValue = this.getMetricValue(stats, rule.requirements.metric);
        const targetValue = rule.requirements.value;
        const progressPercentage = Math.min((currentValue / targetValue) * 100, 100);

        progress.push({
          rule,
          current: currentValue,
          target: targetValue,
          progress: progressPercentage,
          estimatedCompletion: this.estimateCompletion(stats, rule),
        });
      }

      // Sort by progress (closest to completion first)
      return progress.sort((a, b) => b.progress - a.progress).slice(0, 5);
    } catch (error) {
      console.error('Error getting achievement progress:', error);
      return [];
    }
  }

  /**
   * Estimate completion time for achievement
   */
  private estimateCompletion(stats: DonorStats, rule: AchievementRule): string {
    const currentValue = this.getMetricValue(stats, rule.requirements.metric);
    const targetValue = rule.requirements.value;
    const remaining = targetValue - currentValue;

    if (remaining <= 0) return 'Available now';

    // Simple estimation based on historical activity
    const daysActive = stats.lastDeliveryDate 
      ? Math.max(1, (Date.now() - stats.joinedDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    
    const currentRate = currentValue / daysActive;
    
    if (currentRate <= 0) return 'Based on increased activity';
    
    const estimatedDays = Math.ceil(remaining / currentRate);
    
    if (estimatedDays <= 7) return `${estimatedDays} days`;
    if (estimatedDays <= 30) return `${Math.ceil(estimatedDays / 7)} weeks`;
    if (estimatedDays <= 365) return `${Math.ceil(estimatedDays / 30)} months`;
    
    return 'Long-term goal';
  }

  /**
   * Fetch donor statistics from database
   */
  private async fetchDonorStats(donorId: string): Promise<DonorStats> {
    try {
      const response = await fetch(`/api/v1/donors/performance?t=${Date.now()}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch donor stats');
      }

      const metrics = data.data.metrics;
      
      // Calculate additional stats that might not be in the main API
      const historyResponse = await fetch(`/api/v1/donors/performance/history?period=365&t=${Date.now()}`);
      const historyData = await historyResponse.json();
      
      // Extract detailed stats
      const totalCommitments = metrics.totalCommitments;
      const completedDeliveries = metrics.completedDeliveries;
      const onTimeDeliveries = Math.round((metrics.onTimeDeliveryRate / 100) * totalCommitments);
      const accurateQuantityDeliveries = Math.round((metrics.quantityAccuracyRate / 100) * completedDeliveries);

      return {
        donorId,
        totalCommitments,
        completedDeliveries,
        onTimeDeliveries,
        accurateQuantityDeliveries,
        totalBeneficiariesHelped: metrics.beneficiariesHelped,
        consecutiveOnTimeDeliveries: 0, // Would need more detailed tracking
        consecutiveAccurateDeliveries: 0, // Would need more detailed tracking
        perfectPerformanceStreak: Math.round(metrics.performanceScore),
        responseTypesServed: metrics.responseTypesServed,
        locationsServed: [], // Would need location data
        averageResponseTime: 0, // Would need response time tracking
        verificationRate: 100, // Assuming verified responses only
        lastDeliveryDate: new Date(),
        joinedDate: new Date('2024-01-01'), // Default join date
      };
    } catch (error) {
      console.error('Error fetching donor stats:', error);
      // Return default stats on error
      return {
        donorId,
        totalCommitments: 0,
        completedDeliveries: 0,
        onTimeDeliveries: 0,
        accurateQuantityDeliveries: 0,
        totalBeneficiariesHelped: 0,
        consecutiveOnTimeDeliveries: 0,
        consecutiveAccurateDeliveries: 0,
        perfectPerformanceStreak: 0,
        responseTypesServed: [],
        locationsServed: [],
        averageResponseTime: 0,
        verificationRate: 0,
        lastDeliveryDate: new Date(),
        joinedDate: new Date(),
      };
    }
  }

  /**
   * Fetch earned achievements from database
   */
  private async fetchEarnedAchievements(donorId: string) {
    try {
      const response = await fetch(`/api/v1/donors/achievements?t=${Date.now()}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch earned achievements');
      }

      return data.data.achievements
        .filter((a: any) => a.isUnlocked)
        .map((a: any) => ({
          type: a.type,
          earnedAt: new Date(a.unlockedAt),
        }));
    } catch (error) {
      console.error('Error fetching earned achievements:', error);
      return [];
    }
  }

  /**
   * Get all available achievement rules
   */
  getAllRules(): AchievementRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get achievement rule by ID
   */
  getRule(id: string): AchievementRule | undefined {
    return this.rules.get(id);
  }
}

// Singleton instance
export const achievementManager = new AchievementManager();

/**
 * Helper function to check achievements after a performance event
 */
export async function checkDonorAchievements(donorId: string) {
  return achievementManager.checkAchievements({ donorId });
}

/**
 * Get achievement progress for a donor
 */
export async function getDonorAchievementProgress(donorId: string) {
  return achievementManager.getAchievementProgress(donorId);
}