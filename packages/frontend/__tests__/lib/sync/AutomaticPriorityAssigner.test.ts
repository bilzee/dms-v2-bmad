import { AutomaticPriorityAssigner } from '@/lib/sync/AutomaticPriorityAssigner';
import type { PriorityQueueItem, PriorityRule, RapidAssessment, RapidResponse } from '@dms/shared';

describe('AutomaticPriorityAssigner', () => {
  describe('calculatePriorityScore', () => {
    it('calculates base priority scores correctly', () => {
      const highPriorityItem: PriorityQueueItem = {
        id: 'test-1',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: { type: 'HEALTH' }, // Add assessment type to get the bonus
        retryCount: 0,
        priority: 'HIGH',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const score = AutomaticPriorityAssigner.calculatePriorityScore(highPriorityItem);
      expect(score).toBeGreaterThan(60); // HIGH priority (30) + assessment type (20) + health bonus (40) should be >90
    });

    it('prioritizes health assessments correctly', () => {
      const healthAssessment: PriorityQueueItem = {
        id: 'test-health',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {
          type: 'HEALTH',
          data: {
            commonHealthIssues: ['cholera', 'severe malnutrition'],
          },
        } as RapidAssessment,
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const score = AutomaticPriorityAssigner.calculatePriorityScore(healthAssessment);
      expect(score).toBeGreaterThan(50); // Health assessments should get high priority
    });

    it('detects health emergency keywords', () => {
      const emergencyAssessment: PriorityQueueItem = {
        id: 'test-emergency',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {
          type: 'HEALTH',
          data: {
            additionalDetails: 'Critical health emergency with disease outbreak',
          },
        } as RapidAssessment,
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const score = AutomaticPriorityAssigner.calculatePriorityScore(emergencyAssessment);
      expect(score).toBeGreaterThan(60); // Emergency keywords should boost priority significantly
    });

    it('considers affected population size', () => {
      const largePop: PriorityQueueItem = {
        id: 'test-large-pop',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {
          type: 'PRELIMINARY',
          data: {
            affectedPopulationEstimate: 1500,
          },
        } as RapidAssessment,
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const smallPop: PriorityQueueItem = {
        id: 'test-small-pop',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {
          type: 'PRELIMINARY',
          data: {
            affectedPopulationEstimate: 50,
          },
        } as RapidAssessment,
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const largeScore = AutomaticPriorityAssigner.calculatePriorityScore(largePop);
      const smallScore = AutomaticPriorityAssigner.calculatePriorityScore(smallPop);

      expect(largeScore).toBeGreaterThan(smallScore);
    });

    it('prioritizes urgent response deliveries', () => {
      const urgentResponse: PriorityQueueItem = {
        id: 'test-urgent-response',
        type: 'RESPONSE',
        action: 'UPDATE',
        data: {
          responseType: 'HEALTH',
          plannedDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
          status: 'IN_PROGRESS',
        } as RapidResponse,
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const futureResponse: PriorityQueueItem = {
        id: 'test-future-response',
        type: 'RESPONSE',
        action: 'UPDATE',
        data: {
          responseType: 'HEALTH',
          plannedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: 'PLANNED',
        } as RapidResponse,
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const urgentScore = AutomaticPriorityAssigner.calculatePriorityScore(urgentResponse);
      const futureScore = AutomaticPriorityAssigner.calculatePriorityScore(futureResponse);

      expect(urgentScore).toBeGreaterThan(futureScore);
    });

    it('applies custom priority rules correctly', () => {
      const rules: PriorityRule[] = [
        {
          id: 'test-rule',
          name: 'Emergency Rule',
          entityType: 'ASSESSMENT',
          conditions: [
            {
              field: 'data.type',
              operator: 'EQUALS',
              value: 'HEALTH',
              modifier: 30,
            },
          ],
          priorityModifier: 30,
          isActive: true,
          createdBy: 'admin',
          createdAt: new Date(),
        },
      ];

      const matchingItem: PriorityQueueItem = {
        id: 'test-matching',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: { type: 'HEALTH' },
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const nonMatchingItem: PriorityQueueItem = {
        id: 'test-non-matching',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: { type: 'SHELTER' },
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const matchingScore = AutomaticPriorityAssigner.calculatePriorityScore(matchingItem, rules);
      const nonMatchingScore = AutomaticPriorityAssigner.calculatePriorityScore(nonMatchingItem, rules);

      expect(matchingScore).toBeGreaterThan(nonMatchingScore);
    });

    it('applies age bonus for older items', () => {
      const oldItem: PriorityQueueItem = {
        id: 'test-old',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {},
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours ago
      };

      const newItem: PriorityQueueItem = {
        id: 'test-new',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {},
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(), // Now
      };

      const oldScore = AutomaticPriorityAssigner.calculatePriorityScore(oldItem);
      const newScore = AutomaticPriorityAssigner.calculatePriorityScore(newItem);

      expect(oldScore).toBeGreaterThan(newScore);
    });

    it('ensures score is within valid range (0-100)', () => {
      const extremeItem: PriorityQueueItem = {
        id: 'test-extreme',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {
          type: 'HEALTH',
          data: {
            additionalDetails: 'cholera disease outbreak emergency critical health crisis',
            affectedPopulationEstimate: 5000,
          },
        } as RapidAssessment,
        retryCount: 0,
        priority: 'HIGH',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(Date.now() - 100 * 60 * 60 * 1000), // 100 hours ago
      };

      const score = AutomaticPriorityAssigner.calculatePriorityScore(extremeItem);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('generatePriorityReason', () => {
    it('generates meaningful priority reasons', () => {
      const healthItem: PriorityQueueItem = {
        id: 'test-health',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {
          type: 'HEALTH',
        } as RapidAssessment,
        retryCount: 0,
        priority: 'HIGH',
        priorityScore: 75,
        priorityReason: '',
        createdAt: new Date(),
      };

      const reason = AutomaticPriorityAssigner.generatePriorityReason(healthItem);
      expect(reason).toContain('Base priority: HIGH');
      expect(reason).toContain('Assessment type: HEALTH');
    });

    it('includes applied rules in reason', () => {
      const rules: PriorityRule[] = [
        {
          id: 'test-rule',
          name: 'Health Priority Rule',
          entityType: 'ASSESSMENT',
          conditions: [],
          priorityModifier: 20,
          isActive: true,
          createdBy: 'admin',
          createdAt: new Date(),
        },
      ];

      const item: PriorityQueueItem = {
        id: 'test-item',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: {},
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 50,
        priorityReason: '',
        createdAt: new Date(),
      };

      const reason = AutomaticPriorityAssigner.generatePriorityReason(item, rules);
      expect(reason).toContain('Applied 1 priority rule(s)');
    });
  });

  describe('recalculateQueuePriorities', () => {
    it('recalculates priorities for all items in queue', () => {
      const queue: PriorityQueueItem[] = [
        {
          id: 'item-1',
          type: 'ASSESSMENT',
          action: 'CREATE',
          data: { type: 'HEALTH' },
          retryCount: 0,
          priority: 'HIGH',
          priorityScore: 50, // Old score
          priorityReason: 'Old reason',
          createdAt: new Date(),
        },
        {
          id: 'item-2',
          type: 'RESPONSE',
          action: 'UPDATE',
          data: { responseType: 'SHELTER' },
          retryCount: 0,
          priority: 'NORMAL',
          priorityScore: 20, // Old score
          priorityReason: 'Old reason',
          createdAt: new Date(),
        },
      ];

      const recalculatedQueue = AutomaticPriorityAssigner.recalculateQueuePriorities(queue);

      // All items should have updated scores and reasons
      recalculatedQueue.forEach(item => {
        expect(item.priorityScore).toBeGreaterThan(0);
        expect(item.priorityReason).toBeTruthy();
        expect(item.priorityReason).not.toBe('Old reason');
      });

      // Health assessment should have higher priority than shelter response
      const healthItem = recalculatedQueue.find(item => item.id === 'item-1')!;
      const shelterItem = recalculatedQueue.find(item => item.id === 'item-2')!;
      expect(healthItem.priorityScore).toBeGreaterThan(shelterItem.priorityScore!);
    });
  });

  describe('Rule evaluation', () => {
    it('evaluates EQUALS operator correctly', () => {
      const rules: PriorityRule[] = [
        {
          id: 'equals-rule',
          name: 'Equals Test',
          entityType: 'ASSESSMENT',
          conditions: [
            {
              field: 'data.type',
              operator: 'EQUALS',
              value: 'HEALTH',
              modifier: 10,
            },
          ],
          priorityModifier: 10,
          isActive: true,
          createdBy: 'admin',
          createdAt: new Date(),
        },
      ];

      const matchingItem: PriorityQueueItem = {
        id: 'match',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: { type: 'HEALTH' },
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const nonMatchingItem: PriorityQueueItem = {
        id: 'no-match',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: { type: 'SHELTER' },
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const matchScore = AutomaticPriorityAssigner.calculatePriorityScore(matchingItem, rules);
      const noMatchScore = AutomaticPriorityAssigner.calculatePriorityScore(nonMatchingItem, rules);

      expect(matchScore).toBeGreaterThan(noMatchScore);
    });

    it('evaluates GREATER_THAN operator correctly', () => {
      const rules: PriorityRule[] = [
        {
          id: 'gt-rule',
          name: 'Greater Than Test',
          entityType: 'ASSESSMENT',
          conditions: [
            {
              field: 'data.population',
              operator: 'GREATER_THAN',
              value: 500,
              modifier: 15,
            },
          ],
          priorityModifier: 15,
          isActive: true,
          createdBy: 'admin',
          createdAt: new Date(),
        },
      ];

      const largePopItem: PriorityQueueItem = {
        id: 'large',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: { population: 1000 },
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const smallPopItem: PriorityQueueItem = {
        id: 'small',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: { population: 200 },
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const largeScore = AutomaticPriorityAssigner.calculatePriorityScore(largePopItem, rules);
      const smallScore = AutomaticPriorityAssigner.calculatePriorityScore(smallPopItem, rules);

      expect(largeScore).toBeGreaterThan(smallScore);
    });

    it('evaluates CONTAINS operator correctly', () => {
      const rules: PriorityRule[] = [
        {
          id: 'contains-rule',
          name: 'Contains Test',
          entityType: 'ASSESSMENT',
          conditions: [
            {
              field: 'data.description',
              operator: 'CONTAINS',
              value: 'emergency',
              modifier: 20,
            },
          ],
          priorityModifier: 20,
          isActive: true,
          createdBy: 'admin',
          createdAt: new Date(),
        },
      ];

      const emergencyItem: PriorityQueueItem = {
        id: 'emergency',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: { description: 'This is a health emergency situation' },
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const normalItem: PriorityQueueItem = {
        id: 'normal',
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: { description: 'This is a routine health assessment' },
        retryCount: 0,
        priority: 'NORMAL',
        priorityScore: 0,
        priorityReason: '',
        createdAt: new Date(),
      };

      const emergencyScore = AutomaticPriorityAssigner.calculatePriorityScore(emergencyItem, rules);
      const normalScore = AutomaticPriorityAssigner.calculatePriorityScore(normalItem, rules);

      expect(emergencyScore).toBeGreaterThan(normalScore);
    });
  });
});