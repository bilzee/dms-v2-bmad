/**
 * Status Tracking Integration for Performance Metrics
 * 
 * This module handles automatic performance metric updates when:
 * - Commitment status transitions occur (PLANNED → IN_PROGRESS → DELIVERED)
 * - Response verification status changes
 * - Delivery confirmations are received
 */

import { DonorCommitment } from '@dms/shared';

// Status transition events
export enum PerformanceEvent {
  COMMITMENT_CREATED = 'commitment_created',
  COMMITMENT_STARTED = 'commitment_started',
  COMMITMENT_DELIVERED = 'commitment_delivered',
  COMMITMENT_VERIFIED = 'commitment_verified',
  COMMITMENT_CANCELLED = 'commitment_cancelled',
  PERFORMANCE_MILESTONE = 'performance_milestone',
}

interface PerformanceEventData {
  event: PerformanceEvent;
  commitmentId: string;
  donorId: string;
  timestamp: Date;
  previousStatus?: string;
  newStatus?: string;
  metadata?: Record<string, any>;
}

interface StatusTransitionConfig {
  from: string[];
  to: string;
  triggersRecalculation: boolean;
  requiresVerification: boolean;
}

// Status transition rules
const STATUS_TRANSITIONS: Record<string, StatusTransitionConfig> = {
  'PLANNED_TO_IN_PROGRESS': {
    from: ['PLANNED'],
    to: 'IN_PROGRESS',
    triggersRecalculation: false, // Only when tracking start times
    requiresVerification: false,
  },
  'IN_PROGRESS_TO_DELIVERED': {
    from: ['IN_PROGRESS', 'PLANNED'], // Allow direct PLANNED → DELIVERED
    to: 'DELIVERED',
    triggersRecalculation: true, // This affects performance metrics
    requiresVerification: false,
  },
  'DELIVERED_TO_VERIFIED': {
    from: ['DELIVERED'],
    to: 'VERIFIED',
    triggersRecalculation: true, // Verification affects accuracy and impact
    requiresVerification: true,
  },
  'ANY_TO_CANCELLED': {
    from: ['PLANNED', 'IN_PROGRESS'],
    to: 'CANCELLED',
    triggersRecalculation: false, // Cancelled commitments don't affect positive metrics
    requiresVerification: false,
  },
};

class StatusTracker {
  private eventListeners: Map<PerformanceEvent, Array<(data: PerformanceEventData) => void>> = new Map();
  
  constructor() {
    this.initializeEventListeners();
  }

  /**
   * Initialize default event listeners for performance tracking
   */
  private initializeEventListeners() {
    // Listen for delivery events to update performance metrics
    this.addEventListener(PerformanceEvent.COMMITMENT_DELIVERED, this.handleDeliveryEvent.bind(this));
    this.addEventListener(PerformanceEvent.COMMITMENT_VERIFIED, this.handleVerificationEvent.bind(this));
    this.addEventListener(PerformanceEvent.PERFORMANCE_MILESTONE, this.handleMilestoneEvent.bind(this));
  }

  /**
   * Add an event listener for performance events
   */
  addEventListener(event: PerformanceEvent, callback: (data: PerformanceEventData) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(event: PerformanceEvent, callback: (data: PerformanceEventData) => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit a performance event
   */
  emitEvent(eventData: PerformanceEventData) {
    const listeners = this.eventListeners.get(eventData.event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          console.error(`Error in performance event listener for ${eventData.event}:`, error);
        }
      });
    }
  }

  /**
   * Track a status transition for a commitment
   */
  async trackStatusTransition(
    commitment: DonorCommitment,
    previousStatus: string,
    newStatus: string,
    metadata?: Record<string, any>
  ) {
    const eventData: PerformanceEventData = {
      event: this.getEventForTransition(previousStatus, newStatus),
      commitmentId: commitment.id,
      donorId: commitment.donorId,
      timestamp: new Date(),
      previousStatus,
      newStatus,
      metadata,
    };

    // Emit the appropriate event
    this.emitEvent(eventData);

    // Check if this transition requires performance recalculation
    const shouldRecalculate = this.shouldTriggerRecalculation(previousStatus, newStatus);
    
    if (shouldRecalculate) {
      await this.triggerPerformanceRecalculation(commitment.donorId, eventData);
    }

    // Check for milestone achievements
    await this.checkForMilestones(commitment.donorId, eventData);
  }

  /**
   * Get the appropriate event type for a status transition
   */
  private getEventForTransition(from: string, to: string): PerformanceEvent {
    if (to === 'IN_PROGRESS') return PerformanceEvent.COMMITMENT_STARTED;
    if (to === 'DELIVERED') return PerformanceEvent.COMMITMENT_DELIVERED;
    if (to === 'VERIFIED') return PerformanceEvent.COMMITMENT_VERIFIED;
    if (to === 'CANCELLED') return PerformanceEvent.COMMITMENT_CANCELLED;
    return PerformanceEvent.COMMITMENT_CREATED;
  }

  /**
   * Check if a status transition should trigger performance recalculation
   */
  private shouldTriggerRecalculation(from: string, to: string): boolean {
    const transition = Object.values(STATUS_TRANSITIONS).find(
      t => t.from.includes(from) && t.to === to
    );
    return transition?.triggersRecalculation ?? false;
  }

  /**
   * Trigger performance metrics recalculation
   */
  private async triggerPerformanceRecalculation(donorId: string, eventData: PerformanceEventData) {
    try {
      // Call the performance API to refresh metrics
      const response = await fetch(`/api/v1/donors/performance?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok) {
        // Trigger a client-side refresh
        const refreshEvent = new CustomEvent('donor-performance-update', {
          detail: { donorId, eventData, type: 'METRICS_UPDATED' }
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(refreshEvent);
        }
      }

      console.log(`Performance recalculation triggered for donor ${donorId}`, eventData);
    } catch (error) {
      console.error('Error triggering performance recalculation:', error);
    }
  }

  /**
   * Check for milestone achievements
   */
  private async checkForMilestones(donorId: string, eventData: PerformanceEventData) {
    try {
      // Call achievements API to check for new unlocks
      const response = await fetch(`/api/v1/donors/achievements?includeProgress=true&t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const recentAchievements = data.data.recentAchievements || [];
        
        // Check if any achievements were just unlocked (within last minute)
        const justUnlocked = recentAchievements.filter((achievement: any) => {
          const unlockedAt = new Date(achievement.unlockedAt);
          return Date.now() - unlockedAt.getTime() < 60000; // Within last minute
        });

        if (justUnlocked.length > 0) {
          justUnlocked.forEach((achievement: any) => {
            this.emitEvent({
              event: PerformanceEvent.PERFORMANCE_MILESTONE,
              commitmentId: eventData.commitmentId,
              donorId,
              timestamp: new Date(),
              metadata: {
                milestoneType: 'ACHIEVEMENT_UNLOCKED',
                achievementType: achievement.type,
                achievementTitle: achievement.title,
                category: achievement.category,
              },
            });
          });
        }
      }
    } catch (error) {
      console.error('Error checking for milestones:', error);
    }
  }

  /**
   * Handle delivery events
   */
  private async handleDeliveryEvent(data: PerformanceEventData) {
    console.log(`Delivery event processed for commitment ${data.commitmentId}`);
    
    // Update delivery-related metrics
    // - On-time delivery rate calculation
    // - Total deliveries count
    // - Performance score impact
    
    // In a real implementation, this might:
    // 1. Calculate if delivery was on time
    // 2. Update cumulative statistics
    // 3. Trigger impact metrics calculation
  }

  /**
   * Handle verification events
   */
  private async handleVerificationEvent(data: PerformanceEventData) {
    console.log(`Verification event processed for commitment ${data.commitmentId}`);
    
    // Update verification-related metrics
    // - Quantity accuracy verification
    // - Impact metrics (beneficiaries helped)
    // - Verification rate statistics
  }

  /**
   * Handle milestone events
   */
  private async handleMilestoneEvent(data: PerformanceEventData) {
    console.log(`Milestone achieved for donor ${data.donorId}:`, data.metadata);
    
    // Trigger achievement unlock
    // Send notification to user
    // Update achievement display
    
    const achievementEvent = new CustomEvent('donor-achievement-unlocked', {
      detail: { donorId: data.donorId, achievement: data.metadata }
    });
    window.dispatchEvent(achievementEvent);
  }

  /**
   * Get performance impact of a status change
   */
  calculatePerformanceImpact(
    commitment: DonorCommitment,
    from: string,
    to: string,
    deliveryMetadata?: {
      actualDeliveryDate?: Date;
      actualQuantity?: number;
      beneficiariesHelped?: number;
    }
  ) {
    const impact = {
      onTimeDelivery: 0,
      quantityAccuracy: 0,
      beneficiaryImpact: 0,
      performanceScoreChange: 0,
    };

    if (to === 'DELIVERED' && deliveryMetadata) {
      // Calculate on-time delivery impact
      if (deliveryMetadata.actualDeliveryDate && commitment.targetDate) {
        const isOnTime = deliveryMetadata.actualDeliveryDate <= commitment.targetDate;
        impact.onTimeDelivery = isOnTime ? 1 : 0;
      }

      // Calculate quantity accuracy impact
      if (deliveryMetadata.actualQuantity && commitment.quantity) {
        const accuracy = deliveryMetadata.actualQuantity / commitment.quantity;
        impact.quantityAccuracy = Math.min(accuracy, 1); // Cap at 100%
      }

      // Track beneficiary impact
      if (deliveryMetadata.beneficiariesHelped) {
        impact.beneficiaryImpact = deliveryMetadata.beneficiariesHelped;
      }

      // Calculate overall performance score impact
      impact.performanceScoreChange = 
        (impact.onTimeDelivery * 0.4) + 
        (impact.quantityAccuracy * 0.4) + 
        (Math.min(impact.beneficiaryImpact / 50, 1) * 0.2); // Normalized beneficiary impact
    }

    return impact;
  }
}

// Singleton instance
export const statusTracker = new StatusTracker();

/**
 * Helper function to integrate with the donor store
 * This should be called whenever a commitment status changes
 */
export async function trackCommitmentStatusChange(
  commitment: DonorCommitment,
  previousStatus: string,
  newStatus: string,
  metadata?: Record<string, any>
) {
  await statusTracker.trackStatusTransition(commitment, previousStatus, newStatus, metadata);
}

/**
 * Hook into browser events for real-time performance updates
 */
if (typeof window !== 'undefined') {
  // Listen for performance updates and refresh the store
  window.addEventListener('donor-performance-update', async (event: any) => {
    const { donorId, eventData } = event.detail;
    
    // Import the store dynamically to avoid SSR issues
    const { useDonorStore } = await import('@/stores/donor.store');
    const store = useDonorStore.getState();
    
    if (store.currentDonor?.id === donorId) {
      // Refresh performance data after a short delay to allow backend processing
      setTimeout(() => {
        store.refreshPerformanceData();
      }, 1000);
    }
  });

  // Listen for achievement unlocks
  window.addEventListener('donor-achievement-unlocked', (event: any) => {
    const { donorId, achievement } = event.detail;
    
    // Show achievement notification (could integrate with toast system)
    console.log(`🎉 Achievement unlocked for ${donorId}:`, achievement);
    
    // In a real implementation, this might trigger:
    // - Toast notification
    // - Achievement badge animation
    // - Achievement list refresh
  });
}