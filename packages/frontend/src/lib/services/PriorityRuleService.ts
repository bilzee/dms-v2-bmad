import type { PriorityRule, PriorityCondition } from '@dms/shared';

/**
 * Service for managing priority rules with persistence and caching
 */
export class PriorityRuleService {
  private static instance: PriorityRuleService | null = null;
  private rulesCache: Map<string, PriorityRule> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'priority-rules-cache';

  private constructor() {
    this.loadCacheFromStorage();
  }

  /**
   * Singleton pattern for rule service
   */
  public static getInstance(): PriorityRuleService {
    if (!PriorityRuleService.instance) {
      PriorityRuleService.instance = new PriorityRuleService();
    }
    return PriorityRuleService.instance;
  }

  /**
   * Load rules cache from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        
        // Check if cache is still valid
        if (data.timestamp && Date.now() - data.timestamp < this.CACHE_TTL) {
          data.rules.forEach((rule: PriorityRule) => {
            this.rulesCache.set(rule.id, rule);
            this.cacheExpiry.set(rule.id, data.timestamp + this.CACHE_TTL);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load priority rules cache:', error);
    }
  }

  /**
   * Save rules cache to localStorage
   */
  private saveCacheToStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const rules = Array.from(this.rulesCache.values());
      const data = {
        rules,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save priority rules cache:', error);
    }
  }

  /**
   * Check if a rule is cached and not expired
   */
  private isCacheValid(ruleId: string): boolean {
    const expiry = this.cacheExpiry.get(ruleId);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Clear expired rules from cache
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    
    for (const [ruleId, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.rulesCache.delete(ruleId);
        this.cacheExpiry.delete(ruleId);
      }
    }
  }

  /**
   * Get all priority rules with caching
   */
  async getAllRules(): Promise<PriorityRule[]> {
    this.clearExpiredCache();
    
    try {
      // Try to return from cache if available
      const cachedRules = Array.from(this.rulesCache.values());
      if (cachedRules.length > 0) {
        return cachedRules;
      }

      // Fetch from API if cache is empty or expired
      const response = await fetch('/api/v1/sync/priority/rules');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch priority rules');
      }

      // Update cache
      const rules = result.data || [];
      const now = Date.now();
      
      this.rulesCache.clear();
      this.cacheExpiry.clear();
      
      rules.forEach((rule: PriorityRule) => {
        this.rulesCache.set(rule.id, rule);
        this.cacheExpiry.set(rule.id, now + this.CACHE_TTL);
      });
      
      this.saveCacheToStorage();
      return rules;
      
    } catch (error) {
      console.error('Failed to get priority rules:', error);
      // Return cached rules even if expired as fallback
      return Array.from(this.rulesCache.values());
    }
  }

  /**
   * Get active priority rules only
   */
  async getActiveRules(): Promise<PriorityRule[]> {
    const allRules = await this.getAllRules();
    return allRules.filter(rule => rule.isActive);
  }

  /**
   * Get rules by entity type
   */
  async getRulesByType(entityType: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA'): Promise<PriorityRule[]> {
    const allRules = await this.getAllRules();
    return allRules.filter(rule => rule.entityType === entityType && rule.isActive);
  }

  /**
   * Create a new priority rule
   */
  async createRule(rule: Omit<PriorityRule, 'id' | 'createdAt'>): Promise<PriorityRule> {
    const response = await fetch('/api/v1/sync/priority/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create priority rule');
    }

    const newRule = result.data;
    
    // Update cache
    this.rulesCache.set(newRule.id, newRule);
    this.cacheExpiry.set(newRule.id, Date.now() + this.CACHE_TTL);
    this.saveCacheToStorage();
    
    return newRule;
  }

  /**
   * Update an existing priority rule
   */
  async updateRule(id: string, updates: Partial<PriorityRule>): Promise<PriorityRule> {
    const response = await fetch(`/api/v1/sync/priority/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update priority rule');
    }

    const updatedRule = result.data;
    
    // Update cache
    this.rulesCache.set(id, updatedRule);
    this.cacheExpiry.set(id, Date.now() + this.CACHE_TTL);
    this.saveCacheToStorage();
    
    return updatedRule;
  }

  /**
   * Delete a priority rule
   */
  async deleteRule(id: string): Promise<void> {
    const response = await fetch(`/api/v1/sync/priority/rules/${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete priority rule');
    }

    // Remove from cache
    this.rulesCache.delete(id);
    this.cacheExpiry.delete(id);
    this.saveCacheToStorage();
  }

  /**
   * Evaluate priority rules against item data
   */
  async evaluateRules(itemData: any, itemType: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA'): Promise<{
    priorityScore: number;
    appliedRules: Array<{ rule: PriorityRule; modifier: number; reason: string }>;
  }> {
    const rules = await getRulesByType(itemType);
    
    let totalScore = 0;
    const appliedRules: Array<{ rule: PriorityRule; modifier: number; reason: string }> = [];

    for (const rule of rules) {
      const ruleResult = this.evaluateRule(rule, itemData);
      
      if (ruleResult.matches) {
        totalScore += rule.priorityModifier;
        appliedRules.push({
          rule,
          modifier: rule.priorityModifier,
          reason: ruleResult.reason,
        });
      }
    }

    return {
      priorityScore: Math.max(0, Math.min(100, totalScore)),
      appliedRules,
    };
  }

  /**
   * Evaluate a single rule against item data
   */
  private evaluateRule(rule: PriorityRule, itemData: any): { matches: boolean; reason: string } {
    let matchedConditions = 0;
    const reasons: string[] = [];

    for (const condition of rule.conditions) {
      const fieldValue = this.getNestedValue(itemData, condition.field);
      
      if (this.evaluateCondition(condition, fieldValue)) {
        matchedConditions++;
        reasons.push(`${condition.field} ${condition.operator} ${condition.value}`);
      }
    }

    // All conditions must match for rule to apply
    const matches = matchedConditions === rule.conditions.length;
    
    return {
      matches,
      reason: matches ? reasons.join(' AND ') : '',
    };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: PriorityCondition, fieldValue: any): boolean {
    switch (condition.operator) {
      case 'EQUALS':
        return fieldValue === condition.value;
      
      case 'GREATER_THAN':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      
      case 'CONTAINS':
        return typeof fieldValue === 'string' && 
               fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      
      case 'IN_ARRAY':
        return Array.isArray(condition.value) && 
               condition.value.includes(fieldValue);
      
      default:
        return false;
    }
  }

  /**
   * Get nested object value by path (e.g., 'data.assessmentType')
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Invalidate cache (force refresh on next request)
   */
  invalidateCache(): void {
    this.rulesCache.clear();
    this.cacheExpiry.clear();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; expiredCount: number } {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const expiry of this.cacheExpiry.values()) {
      if (now >= expiry) {
        expiredCount++;
      }
    }
    
    return {
      size: this.rulesCache.size,
      expiredCount,
    };
  }
}

// Export singleton instance
export const priorityRuleService = PriorityRuleService.getInstance();

// Export individual functions for easier imports
export const {
  getAllRules,
  getActiveRules,
  getRulesByType,
  createRule,
  updateRule,
  deleteRule,
  evaluateRules,
  invalidateCache,
  getCacheStats,
} = priorityRuleService;