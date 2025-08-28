/**
 * Priority Event Logger for tracking priority changes and sync events
 */

export interface PriorityEvent {
  id: string;
  timestamp: Date;
  eventType: 'PRIORITY_OVERRIDE' | 'PRIORITY_CALCULATED' | 'RULE_APPLIED' | 'SYNC_PRIORITY_CHANGE';
  itemId: string;
  itemType: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA' | 'INCIDENT' | 'ENTITY';
  oldPriority?: number;
  newPriority: number;
  reason: string;
  userId?: string;
  userRole?: string;
  metadata?: Record<string, any>;
}

export interface PriorityAuditLog {
  events: PriorityEvent[];
  totalEvents: number;
  lastUpdated: Date;
}

class PriorityEventLoggerService {
  private static instance: PriorityEventLoggerService | null = null;
  private events: PriorityEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep only last 1000 events in memory
  private readonly STORAGE_KEY = 'priority-event-log';

  private constructor() {
    this.loadEventsFromStorage();
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): PriorityEventLoggerService {
    if (!PriorityEventLoggerService.instance) {
      PriorityEventLoggerService.instance = new PriorityEventLoggerService();
    }
    return PriorityEventLoggerService.instance;
  }

  /**
   * Load events from localStorage
   */
  private loadEventsFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.events = data.events?.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp),
        })) || [];
      }
    } catch (error) {
      console.error('Failed to load priority event log from storage:', error);
    }
  }

  /**
   * Save events to localStorage
   */
  private saveEventsToStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const data = {
        events: this.events.slice(-this.MAX_EVENTS), // Keep only recent events
        lastUpdated: new Date(),
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save priority event log to storage:', error);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a priority override event
   */
  logPriorityOverride(
    itemId: string,
    itemType: PriorityEvent['itemType'],
    oldPriority: number,
    newPriority: number,
    justification: string,
    userId?: string,
    userRole?: string
  ): PriorityEvent {
    const event: PriorityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'PRIORITY_OVERRIDE',
      itemId,
      itemType,
      oldPriority,
      newPriority,
      reason: justification,
      userId,
      userRole,
      metadata: {
        manualOverride: true,
        priorityChange: newPriority - oldPriority,
      },
    };

    this.addEvent(event);
    
    // Send to server for persistent storage
    this.sendEventToServer(event).catch(error => {
      console.error('Failed to send priority override event to server:', error);
    });

    return event;
  }

  /**
   * Log automatic priority calculation
   */
  logPriorityCalculation(
    itemId: string,
    itemType: PriorityEvent['itemType'],
    calculatedPriority: number,
    appliedRules: Array<{ ruleName: string; modifier: number }>,
    oldPriority?: number
  ): PriorityEvent {
    const rulesDescription = appliedRules.length > 0
      ? `Applied rules: ${appliedRules.map(r => `${r.ruleName}(+${r.modifier})`).join(', ')}`
      : 'No rules matched, using base priority';

    const event: PriorityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'PRIORITY_CALCULATED',
      itemId,
      itemType,
      oldPriority,
      newPriority: calculatedPriority,
      reason: rulesDescription,
      metadata: {
        automaticCalculation: true,
        appliedRules: appliedRules.map(r => r.ruleName),
        totalModifier: appliedRules.reduce((sum, r) => sum + r.modifier, 0),
      },
    };

    this.addEvent(event);
    
    // Send to server for analytics
    this.sendEventToServer(event).catch(error => {
      console.error('Failed to send priority calculation event to server:', error);
    });

    return event;
  }

  /**
   * Log rule application
   */
  logRuleApplied(
    itemId: string,
    itemType: PriorityEvent['itemType'],
    ruleName: string,
    modifier: number,
    conditions: string
  ): PriorityEvent {
    const event: PriorityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'RULE_APPLIED',
      itemId,
      itemType,
      newPriority: modifier, // Using modifier as the priority change
      reason: `Rule "${ruleName}" applied: ${conditions}`,
      metadata: {
        ruleName,
        modifier,
        conditions,
      },
    };

    this.addEvent(event);
    return event;
  }

  /**
   * Log sync priority changes
   */
  logSyncPriorityChange(
    itemId: string,
    itemType: PriorityEvent['itemType'],
    oldPriority: number,
    newPriority: number,
    reason: string,
    metadata?: Record<string, any>
  ): PriorityEvent {
    const event: PriorityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: 'SYNC_PRIORITY_CHANGE',
      itemId,
      itemType,
      oldPriority,
      newPriority,
      reason,
      metadata: {
        ...metadata,
        priorityChange: newPriority - oldPriority,
      },
    };

    this.addEvent(event);
    return event;
  }

  /**
   * Add event to local log
   */
  private addEvent(event: PriorityEvent): void {
    this.events.push(event);
    
    // Keep only recent events in memory
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    this.saveEventsToStorage();
  }

  /**
   * Send event to server for persistent storage
   */
  private async sendEventToServer(event: PriorityEvent): Promise<void> {
    try {
      const response = await fetch('/api/v1/sync/priority/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Store failed events for retry
      console.warn('Failed to send priority event to server, storing for retry:', error);
      // Could implement retry mechanism here
    }
  }

  /**
   * Get events for a specific item
   */
  getEventsForItem(itemId: string): PriorityEvent[] {
    return this.events.filter(event => event.itemId === itemId);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: PriorityEvent['eventType']): PriorityEvent[] {
    return this.events.filter(event => event.eventType === eventType);
  }

  /**
   * Get recent events (last N events)
   */
  getRecentEvents(limit: number = 50): PriorityEvent[] {
    return this.events.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Get events within time range
   */
  getEventsInRange(startDate: Date, endDate: Date): PriorityEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startDate && event.timestamp <= endDate
    );
  }

  /**
   * Get priority override statistics
   */
  getOverrideStats(): {
    totalOverrides: number;
    avgPriorityIncrease: number;
    avgPriorityDecrease: number;
    mostActiveUsers: Array<{ userId: string; overrideCount: number }>;
  } {
    const overrides = this.events.filter(e => e.eventType === 'PRIORITY_OVERRIDE');
    
    let totalIncrease = 0;
    let totalDecrease = 0;
    let increaseCount = 0;
    let decreaseCount = 0;
    
    const userCounts: Record<string, number> = {};

    for (const event of overrides) {
      const change = (event.newPriority || 0) - (event.oldPriority || 0);
      
      if (change > 0) {
        totalIncrease += change;
        increaseCount++;
      } else if (change < 0) {
        totalDecrease += Math.abs(change);
        decreaseCount++;
      }

      if (event.userId) {
        userCounts[event.userId] = (userCounts[event.userId] || 0) + 1;
      }
    }

    const mostActiveUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, overrideCount: count }))
      .sort((a, b) => b.overrideCount - a.overrideCount)
      .slice(0, 5);

    return {
      totalOverrides: overrides.length,
      avgPriorityIncrease: increaseCount > 0 ? totalIncrease / increaseCount : 0,
      avgPriorityDecrease: decreaseCount > 0 ? totalDecrease / decreaseCount : 0,
      mostActiveUsers,
    };
  }

  /**
   * Export audit log
   */
  exportAuditLog(): PriorityAuditLog {
    return {
      events: [...this.events],
      totalEvents: this.events.length,
      lastUpdated: new Date(),
    };
  }

  /**
   * Clear event log (with confirmation)
   */
  clearLog(): void {
    this.events = [];
    this.saveEventsToStorage();
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    totalEvents: number;
    eventsByType: Record<PriorityEvent['eventType'], number>;
    oldestEvent?: Date;
    newestEvent?: Date;
  } {
    const eventsByType: Record<PriorityEvent['eventType'], number> = {
      'PRIORITY_OVERRIDE': 0,
      'PRIORITY_CALCULATED': 0,
      'RULE_APPLIED': 0,
      'SYNC_PRIORITY_CHANGE': 0,
    };

    for (const event of this.events) {
      eventsByType[event.eventType]++;
    }

    return {
      totalEvents: this.events.length,
      eventsByType,
      oldestEvent: this.events.length > 0 ? this.events[0].timestamp : undefined,
      newestEvent: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : undefined,
    };
  }
}

// Export singleton instance
export const priorityEventLogger = PriorityEventLoggerService.getInstance();

// Export individual methods for easier imports
export const {
  logPriorityOverride,
  logPriorityCalculation,
  logRuleApplied,
  logSyncPriorityChange,
  getEventsForItem,
  getEventsByType,
  getRecentEvents,
  getEventsInRange,
  getOverrideStats,
  exportAuditLog,
  getLogStats,
} = priorityEventLogger;