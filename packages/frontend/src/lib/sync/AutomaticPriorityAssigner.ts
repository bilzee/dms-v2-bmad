import type { 
  PriorityQueueItem, 
  PriorityRule, 
  PriorityCondition,
  RapidAssessment,
  RapidResponse 
} from '@dms/shared';
import { AssessmentType, ResponseType } from '@dms/shared';

/**
 * AutomaticPriorityAssigner service for content-based priority detection
 * Implements AC: 2 - Automatic priority assignment based on assessment content
 */
export class AutomaticPriorityAssigner {
  // Health emergency keywords for priority detection
  private static readonly HEALTH_EMERGENCY_KEYWORDS = [
    'cholera', 'disease outbreak', 'epidemic', 'maternal death', 'child death',
    'malnutrition', 'severe malnutrition', 'emergency health', 'critical health',
    'health crisis', 'medical emergency', 'urgent health', 'death', 'mortality'
  ];

  // High-risk location patterns (can be configured based on region)
  private static readonly HIGH_RISK_LOCATIONS = [
    'conflict zone', 'border area', 'refugee camp', 'flood zone', 'earthquake zone'
  ];

  // Assessment type priority mapping (HEALTH > SHELTER > WASH > PROTECTION)
  private static readonly ASSESSMENT_TYPE_PRIORITY = {
    [AssessmentType.HEALTH]: 40,
    [AssessmentType.SHELTER]: 30,
    [AssessmentType.WASH]: 25,
    [AssessmentType.FOOD]: 20,
    [AssessmentType.SECURITY]: 15,
    [AssessmentType.POPULATION]: 10,
    [AssessmentType.PRELIMINARY]: 5,
  };

  // Response type priority mapping
  private static readonly RESPONSE_TYPE_PRIORITY = {
    [ResponseType.HEALTH]: 40,
    [ResponseType.SHELTER]: 30,
    [ResponseType.WASH]: 25,
    [ResponseType.FOOD]: 20,
    [ResponseType.SECURITY]: 15,
    [ResponseType.POPULATION]: 10,
  };

  /**
   * Calculate priority score for a queue item based on content analysis
   */
  public static calculatePriorityScore(item: PriorityQueueItem, rules: PriorityRule[] = []): number {
    let baseScore = 0;
    let reasons: string[] = [];

    // 1. Base priority from existing HIGH/NORMAL/LOW system
    baseScore += this.getBasePriorityScore(item.priority);

    // 2. Content-based priority analysis
    if (item.type === 'ASSESSMENT') {
      const { score, reason } = this.analyzeAssessmentPriority(item);
      baseScore += score;
      if (reason) reasons.push(reason);
    } else if (item.type === 'RESPONSE') {
      const { score, reason } = this.analyzeResponsePriority(item);
      baseScore += score;
      if (reason) reasons.push(reason);
    }

    // 3. Apply custom priority rules
    const ruleScore = this.applyPriorityRules(item, rules);
    baseScore += ruleScore;

    // 4. Time-based urgency factor (older items get slight priority boost)
    const ageScore = this.calculateAgeBonus(item.createdAt);
    baseScore += ageScore;

    // Ensure score is within 0-100 range
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));

    return finalScore;
  }

  /**
   * Generate priority reason explanation
   */
  public static generatePriorityReason(item: PriorityQueueItem, rules: PriorityRule[] = []): string {
    const reasons: string[] = [];

    // Base priority reason
    reasons.push(`Base priority: ${item.priority}`);

    // Content-specific reasons
    if (item.type === 'ASSESSMENT') {
      const assessmentData = item.data as RapidAssessment;
      if (assessmentData?.type) {
        reasons.push(`Assessment type: ${assessmentData.type}`);
      }
    } else if (item.type === 'RESPONSE') {
      const responseData = item.data as RapidResponse;
      if (responseData?.responseType) {
        reasons.push(`Response type: ${responseData.responseType}`);
      }
    }

    // Applied rules
    const applicableRules = rules.filter(rule => 
      rule.isActive && rule.entityType === item.type
    );
    if (applicableRules.length > 0) {
      reasons.push(`Applied ${applicableRules.length} priority rule(s)`);
    }

    return reasons.join('; ');
  }

  /**
   * Convert existing HIGH/NORMAL/LOW priority to numeric score
   */
  private static getBasePriorityScore(priority: 'HIGH' | 'NORMAL' | 'LOW'): number {
    switch (priority) {
      case 'HIGH': return 30;
      case 'NORMAL': return 15;
      case 'LOW': return 5;
      default: return 15;
    }
  }

  /**
   * Analyze assessment content for priority indicators
   */
  private static analyzeAssessmentPriority(item: PriorityQueueItem): { score: number; reason?: string } {
    const assessment = item.data as RapidAssessment;
    let score = 0;
    let reasons: string[] = [];

    // Assessment type priority
    if (assessment?.type && this.ASSESSMENT_TYPE_PRIORITY[assessment.type]) {
      score += this.ASSESSMENT_TYPE_PRIORITY[assessment.type];
    }

    // Health emergency keyword detection
    if (assessment?.type === AssessmentType.HEALTH && assessment.data) {
      const healthData = assessment.data;
      const textContent = JSON.stringify(healthData).toLowerCase();
      
      const emergencyKeywords = this.HEALTH_EMERGENCY_KEYWORDS.filter(keyword =>
        textContent.includes(keyword.toLowerCase())
      );
      
      if (emergencyKeywords.length > 0) {
        score += 20; // Emergency health situation bonus
        reasons.push('Health emergency detected');
      }
    }

    // Severity-based scoring (if preliminary assessment)
    if (assessment?.type === AssessmentType.PRELIMINARY) {
      const prelimData = assessment.data as any;
      if (prelimData?.severity === 'CATASTROPHIC') {
        score += 25;
        reasons.push('Catastrophic severity');
      } else if (prelimData?.severity === 'SEVERE') {
        score += 15;
        reasons.push('Severe incident');
      }

      // Large population impact
      if (prelimData?.affectedPopulationEstimate > 1000) {
        score += 10;
        reasons.push('Large population affected');
      }
    }

    // Beneficiary count analysis (higher numbers = higher priority)
    const beneficiaryCount = this.extractBeneficiaryCount(assessment);
    if (beneficiaryCount > 500) {
      score += 15;
      reasons.push('High beneficiary count');
    } else if (beneficiaryCount > 100) {
      score += 8;
      reasons.push('Moderate beneficiary count');
    }

    return { 
      score, 
      reason: reasons.length > 0 ? reasons.join(', ') : undefined 
    };
  }

  /**
   * Analyze response content for priority indicators
   */
  private static analyzeResponsePriority(item: PriorityQueueItem): { score: number; reason?: string } {
    const response = item.data as RapidResponse;
    let score = 0;
    let reasons: string[] = [];

    // Response type priority
    if (response?.responseType && this.RESPONSE_TYPE_PRIORITY[response.responseType]) {
      score += this.RESPONSE_TYPE_PRIORITY[response.responseType];
    }

    // Delivery urgency
    if (response?.plannedDate) {
      const plannedDate = new Date(response.plannedDate);
      const now = new Date();
      const daysUntilDelivery = (plannedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilDelivery <= 1) {
        score += 20;
        reasons.push('Urgent delivery (within 24h)');
      } else if (daysUntilDelivery <= 3) {
        score += 10;
        reasons.push('Near-term delivery (within 3 days)');
      }
    }

    // Status-based priority
    if (response?.status === 'IN_PROGRESS') {
      score += 15;
      reasons.push('Delivery in progress');
    }

    return { 
      score, 
      reason: reasons.length > 0 ? reasons.join(', ') : undefined 
    };
  }

  /**
   * Apply custom priority rules to calculate additional score
   */
  private static applyPriorityRules(item: PriorityQueueItem, rules: PriorityRule[]): number {
    let totalModifier = 0;

    const applicableRules = rules.filter(rule => 
      rule.isActive && rule.entityType === item.type
    );

    for (const rule of applicableRules) {
      if (this.evaluateRuleConditions(item, rule.conditions)) {
        totalModifier += rule.priorityModifier;
      }
    }

    return totalModifier;
  }

  /**
   * Evaluate if all conditions in a rule match the item
   */
  private static evaluateRuleConditions(item: PriorityQueueItem, conditions: PriorityCondition[]): boolean {
    return conditions.every(condition => this.evaluateCondition(item, condition));
  }

  /**
   * Evaluate a single condition against the item
   */
  private static evaluateCondition(item: PriorityQueueItem, condition: PriorityCondition): boolean {
    const fieldValue = this.getNestedFieldValue(item, condition.field);

    switch (condition.operator) {
      case 'EQUALS':
        return fieldValue === condition.value;
      
      case 'GREATER_THAN':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      
      case 'CONTAINS':
        return typeof fieldValue === 'string' && 
               fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      
      case 'IN_ARRAY':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      
      default:
        return false;
    }
  }

  /**
   * Get nested field value from item using dot notation
   */
  private static getNestedFieldValue(item: PriorityQueueItem, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], item);
  }

  /**
   * Extract beneficiary count from assessment data
   */
  private static extractBeneficiaryCount(assessment: RapidAssessment): number {
    const data = assessment.data;
    
    // Try to extract from different assessment types
    if (data && typeof data === 'object') {
      // Population assessment
      if ('totalPopulation' in data) {
        return data.totalPopulation as number;
      }
      
      // Preliminary assessment
      if ('affectedPopulationEstimate' in data) {
        return data.affectedPopulationEstimate as number;
      }
      
      // Other assessment types might have different fields
      // This can be extended based on actual data structure
    }

    return 0;
  }

  /**
   * Calculate age-based priority bonus (older items get slight boost)
   */
  private static calculateAgeBonus(createdAt: Date): number {
    const now = new Date();
    const ageInHours = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

    if (ageInHours > 48) return 5; // Items older than 2 days get small boost
    if (ageInHours > 24) return 3; // Items older than 1 day get smaller boost
    return 0;
  }

  /**
   * Recalculate priorities for all items in a queue
   */
  public static recalculateQueuePriorities(queue: PriorityQueueItem[], rules: PriorityRule[] = []): PriorityQueueItem[] {
    return queue.map(item => ({
      ...item,
      priorityScore: this.calculatePriorityScore(item, rules),
      priorityReason: this.generatePriorityReason(item, rules),
    }));
  }
}