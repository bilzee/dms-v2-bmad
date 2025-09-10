import { OfflineQueueService } from './OfflineQueueService';
import type { OfflineQueueItem } from '@dms/shared';

export interface SampleDataConfig {
  enabled: boolean;
  environment: 'development' | 'testing' | 'production';
  autoPopulate: boolean;
  itemCount?: number;
}

/**
 * Enhanced service for queue data management with configuration support
 * Following CLAUDE.md principles - API-level service abstraction for mock data
 * 
 * Features:
 * - Environment-based configuration
 * - Mock vs real data configuration flags
 * - Backward compatibility for testing
 * - Client-side IndexedDB integration (since API endpoint deprecated to client-side)
 */
export class SampleDataService {
  private queueService: OfflineQueueService;
  private config: SampleDataConfig;

  constructor(config: SampleDataConfig = {
    enabled: process.env.NODE_ENV === 'development',
    environment: process.env.NODE_ENV as any || 'development',
    autoPopulate: false,
  }) {
    this.queueService = new OfflineQueueService();
    this.config = config;
  }

  /**
   * Get current service configuration
   */
  getConfig(): SampleDataConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfig(updates: Partial<SampleDataConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Add sample queue items to the database for testing
   * Respects configuration settings for environment and enabled state
   */
  async addSampleQueueData(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Sample data service is disabled');
      return;
    }

    if (this.config.environment === 'production') {
      console.warn('Sample data generation attempted in production environment - skipping');
      return;
    }

    try {
      console.log('Adding sample queue data...');
      
      const sampleItems: Omit<OfflineQueueItem, 'id'>[] = [
        {
          type: 'ASSESSMENT',
          action: 'CREATE',
          data: { 
            assessmentType: 'HEALTH', 
            priority: 'HIGH',
            affectedEntityId: 'entity_1',
            assessorId: 'assessor_1'
          },
          retryCount: 1,
          priority: 'HIGH',
          createdAt: new Date('2025-08-22T10:00:00Z'),
          lastAttempt: new Date('2025-08-22T10:05:00Z'),
          error: 'Network timeout - connection failed',
        },
        {
          type: 'ASSESSMENT',
          action: 'CREATE',
          data: { 
            assessmentType: 'WASH', 
            priority: 'NORMAL',
            affectedEntityId: 'entity_2',
            assessorId: 'assessor_1'
          },
          retryCount: 1,
          priority: 'NORMAL',
          createdAt: new Date('2025-08-22T09:30:00Z'),
          lastAttempt: new Date('2025-08-22T09:45:00Z'),
          // This item is currently syncing (retryCount > 0 and no error)
        },
        {
          type: 'MEDIA',
          action: 'CREATE',
          data: { 
            fileName: 'emergency-photo.jpg',
            fileSize: 2048000,
            mimeType: 'image/jpeg'
          },
          retryCount: 0,
          priority: 'HIGH',
          createdAt: new Date('2025-08-22T09:00:00Z'),
        },
        {
          type: 'ASSESSMENT',
          action: 'UPDATE',
          data: { 
            assessmentType: 'SHELTER',
            assessmentId: 'assessment_123',
            priority: 'NORMAL'
          },
          retryCount: 2,
          priority: 'NORMAL',
          createdAt: new Date('2025-08-22T08:30:00Z'),
          lastAttempt: new Date('2025-08-22T09:00:00Z'),
          error: 'Validation failed - missing required fields',
        },
        {
          type: 'INCIDENT',
          action: 'CREATE',
          data: { 
            incidentType: 'FLOOD',
            severity: 'HIGH',
            location: { lat: 9.0765, lon: 7.3986 }
          },
          retryCount: 0,
          priority: 'HIGH',
          createdAt: new Date('2025-08-22T08:00:00Z'),
        },
        {
          type: 'ENTITY',
          action: 'CREATE',
          data: { 
            entityType: 'CAMP',
            name: 'Temporary Settlement Site A',
            population: 250
          },
          retryCount: 1,
          priority: 'NORMAL',
          createdAt: new Date('2025-08-22T07:30:00Z'),
          lastAttempt: new Date('2025-08-22T07:45:00Z'),
          error: 'Server error - please retry',
        },
      ];

      // Clear existing sample data first
      const existingItems = await this.queueService.getQueueItems();
      for (const item of existingItems) {
        if (item.data && typeof item.data === 'object' && 'assessmentType' in item.data) {
          await this.queueService.removeQueueItem(item.id);
        }
      }

      // Add new sample items
      for (const item of sampleItems) {
        await this.queueService.addToQueue(item);
      }

      console.log(`Added ${sampleItems.length} sample queue items`);
      
      // Log summary
      const summary = await this.queueService.getQueueSummary();
      console.log('Queue summary:', summary);
      
    } catch (error) {
      console.error('Failed to add sample queue data:', error);
      throw error;
    }
  }

  /**
   * Clear all sample data (useful for cleanup)
   */
  async clearSampleData(): Promise<void> {
    try {
      console.log('Clearing sample queue data...');
      const items = await this.queueService.getQueueItems();
      
      // Only remove sample items (those with specific patterns in data)
      for (const item of items) {
        if (item.data && typeof item.data === 'object') {
          const data = item.data as any;
          if (data.assessmentType || data.fileName || data.incidentType || data.entityType) {
            await this.queueService.removeQueueItem(item.id);
          }
        }
      }
      
      console.log('Sample data cleared');
    } catch (error) {
      console.error('Failed to clear sample data:', error);
      throw error;
    }
  }

  /**
   * Check if sample data exists
   */
  async hasSampleData(): Promise<boolean> {
    try {
      const items = await this.queueService.getQueueItems();
      return items.some(item => 
        item.data && 
        typeof item.data === 'object' && 
        ('assessmentType' in item.data || 'fileName' in item.data)
      );
    } catch (error) {
      console.error('Failed to check for sample data:', error);
      return false;
    }
  }

  /**
   * Check if the service should use mock data or real data
   * In this case, since the queue is client-side IndexedDB, we always use "real" client-side data
   */
  shouldUseMockData(): boolean {
    return this.config.enabled && this.config.environment !== 'production';
  }

  /**
   * Get queue items (enhanced method that respects configuration)
   */
  async getQueueItems(options?: { status?: string }): Promise<OfflineQueueItem[]> {
    try {
      const items = await this.queueService.getQueueItems(options as any);
      
      // Auto-populate sample data if configured and no items exist
      if (this.config.autoPopulate && items.length === 0 && this.shouldUseMockData()) {
        await this.addSampleQueueData();
        return await this.queueService.getQueueItems(options as any);
      }
      
      return items;
    } catch (error) {
      console.error('Failed to get queue items:', error);
      return [];
    }
  }

  /**
   * Get queue summary with configuration awareness
   */
  async getQueueSummary(): Promise<any> {
    try {
      return await this.queueService.getQueueSummary();
    } catch (error) {
      console.error('Failed to get queue summary:', error);
      return { total: 0, pending: 0, failed: 0, processing: 0 };
    }
  }

  /**
   * Simulate some queue processing for demo purposes
   */
  async simulateQueueProcessing(): Promise<void> {
    if (!this.shouldUseMockData()) {
      console.log('Queue simulation skipped - not in mock data mode');
      return;
    }

    try {
      console.log('Simulating queue processing...');
      
      // Get some pending items and simulate processing
      const pendingItems = await this.queueService.getQueueItems({ status: 'PENDING' });
      
      if (pendingItems.length > 0) {
        // Process the first pending item
        const item = pendingItems[0];
        console.log(`Processing item: ${item.id}`);
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 70% chance of success
        const success = Math.random() > 0.3;
        
        if (success) {
          await this.queueService.removeQueueItem(item.id);
          console.log(`Item ${item.id} processed successfully`);
        } else {
          await this.queueService.retryQueueItem(item.id);
          console.log(`Item ${item.id} failed and marked for retry`);
        }
      } else {
        console.log('No pending items to process');
      }
    } catch (error) {
      console.error('Failed to simulate queue processing:', error);
      throw error;
    }
  }
}