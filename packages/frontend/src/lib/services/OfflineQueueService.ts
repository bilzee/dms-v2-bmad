import { db, QueueRecord } from '../offline/db';
import type { OfflineQueueItem } from '@dms/shared';

export interface QueueFilters {
  status?: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  type?: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA' | 'INCIDENT' | 'ENTITY';
  user_id?: string;
}

export class OfflineQueueService {
  
  /**
   * Get queue items with filtering and sorting
   */
  async getQueueItems(filters?: QueueFilters): Promise<OfflineQueueItem[]> {
    try {
      let query = db.queue.orderBy('createdAt').reverse();
      
      // Apply filters
      const items = await query.toArray();
      let filteredItems = items;

      if (filters?.status) {
        filteredItems = filteredItems.filter(item => {
          const status = this.getItemStatus(item);
          return status === filters.status;
        });
      }

      if (filters?.priority) {
        filteredItems = filteredItems.filter(item => item.priority === filters.priority);
      }

      if (filters?.type) {
        filteredItems = filteredItems.filter(item => item.type === filters.type);
      }

      // Sort by priority (HIGH first) then by creation date (newest first)
      filteredItems.sort((a, b) => {
        const priorityOrder = { HIGH: 3, NORMAL: 2, LOW: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return filteredItems.map(this.mapQueueRecordToItem);
    } catch (error) {
      console.error('Failed to get queue items:', error);
      throw error;
    }
  }

  /**
   * Get queue item by ID
   */
  async getQueueItem(id: string): Promise<OfflineQueueItem | null> {
    try {
      const item = await db.queue.get(id);
      return item ? this.mapQueueRecordToItem(item) : null;
    } catch (error) {
      console.error('Failed to get queue item:', error);
      throw error;
    }
  }

  /**
   * Add item to queue
   */
  async addToQueue(item: Omit<OfflineQueueItem, 'id'>): Promise<string> {
    try {
      const id = await db.addToQueue(item);
      return String(id);
    } catch (error) {
      console.error('Failed to add to queue:', error);
      throw error;
    }
  }

  /**
   * Retry a failed queue item
   */
  async retryQueueItem(id: string): Promise<void> {
    try {
      const item = await db.queue.get(id);
      if (!item) {
        throw new Error(`Queue item with id ${id} not found`);
      }

      await db.updateQueueItem(id, {
        retryCount: item.retryCount + 1,
        lastAttempt: new Date(),
        error: undefined, // Clear error to mark as retrying
      });

      // Trigger the actual sync process
      await this.performSync(id);
    } catch (error) {
      console.error('Failed to retry queue item:', error);
      throw error;
    }
  }

  /**
   * Remove item from queue
   */
  async removeQueueItem(id: string): Promise<void> {
    try {
      await db.removeFromQueue(id);
    } catch (error) {
      console.error('Failed to remove queue item:', error);
      throw error;
    }
  }

  /**
   * Get queue summary statistics
   */
  async getQueueSummary(): Promise<{
    total: number;
    pending: number;
    failed: number;
    syncing: number;
    highPriority: number;
  }> {
    try {
      const items = await db.queue.toArray();
      
      const summary = {
        total: items.length,
        pending: 0,
        failed: 0,
        syncing: 0,
        highPriority: items.filter(item => item.priority === 'HIGH').length,
      };

      items.forEach(item => {
        const status = this.getItemStatus(item);
        switch (status) {
          case 'PENDING':
            summary.pending++;
            break;
          case 'FAILED':
            summary.failed++;
            break;
          case 'SYNCING':
            summary.syncing++;
            break;
        }
      });

      return summary;
    } catch (error) {
      console.error('Failed to get queue summary:', error);
      throw error;
    }
  }

  /**
   * Clear all queue items (useful for testing)
   */
  async clearQueue(): Promise<void> {
    try {
      await db.clearQueue();
    } catch (error) {
      console.error('Failed to clear queue:', error);
      throw error;
    }
  }

  /**
   * Determine the status of a queue item based on its properties
   */
  private getItemStatus(item: QueueRecord): 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED' {
    if (item.error && item.retryCount > 0) {
      return 'FAILED';
    }
    if (item.retryCount > 0 && !item.error) {
      return 'SYNCING';
    }
    if (item.retryCount === 0 && !item.error) {
      return 'PENDING';
    }
    return 'SYNCED'; // Default case for synced items
  }

  /**
   * Map QueueRecord to OfflineQueueItem
   */
  private mapQueueRecordToItem(record: QueueRecord): OfflineQueueItem {
    const { lastModified, ...item } = record;
    return item;
  }

  /**
   * Perform actual sync process for a queue item
   */
  private async performSync(id: string): Promise<void> {
    const item = await db.queue.get(id);
    if (!item) {
      throw new Error(`Queue item with id ${id} not found`);
    }

    try {
      // Update status to show it's syncing
      await db.updateQueueItem(id, {
        lastAttempt: new Date(),
        error: undefined, // Clear previous errors
      });

      // Perform the actual sync operation based on item type and action
      let success = false;
      let errorMessage = '';

      switch (item.type) {
        case 'ASSESSMENT':
          success = await this.syncAssessment(item);
          break;
        case 'RESPONSE':
          success = await this.syncResponse(item);
          break;
        case 'MEDIA':
          success = await this.syncMedia(item);
          break;
        case 'INCIDENT':
          success = await this.syncIncident(item);
          break;
        case 'ENTITY':
          success = await this.syncEntity(item);
          break;
        default:
          errorMessage = `Unknown item type: ${item.type}`;
          success = false;
      }

      if (success) {
        // Remove from queue on successful sync
        await db.removeFromQueue(id);
      } else {
        // Mark as failed with appropriate error message
        await db.updateQueueItem(id, {
          error: errorMessage || 'Sync operation failed',
          lastAttempt: new Date(),
        });
      }

    } catch (error) {
      // Handle network or other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      await db.updateQueueItem(id, {
        error: `Sync failed: ${errorMessage}`,
        lastAttempt: new Date(),
      });
    }
  }

  /**
   * Sync assessment data to server
   */
  private async syncAssessment(item: any): Promise<boolean> {
    try {
      const apiUrl = '/api/v1/assessments';
      const method = item.action === 'CREATE' ? 'POST' : 
                    item.action === 'UPDATE' ? 'PUT' : 
                    item.action === 'DELETE' ? 'DELETE' : 'POST';
      
      const url = item.action === 'UPDATE' || item.action === 'DELETE' 
        ? `${apiUrl}/${item.entityId}` 
        : apiUrl;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: item.action !== 'DELETE' ? JSON.stringify(item.data) : undefined,
      });

      return response.ok;
    } catch (error) {
      console.error('Assessment sync failed:', error);
      return false;
    }
  }

  /**
   * Sync response data to server
   */
  private async syncResponse(item: any): Promise<boolean> {
    try {
      const apiUrl = '/api/v1/responses';
      const method = item.action === 'CREATE' ? 'POST' : 
                    item.action === 'UPDATE' ? 'PUT' : 
                    item.action === 'DELETE' ? 'DELETE' : 'POST';
      
      const url = item.action === 'UPDATE' || item.action === 'DELETE' 
        ? `${apiUrl}/${item.entityId}` 
        : apiUrl;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: item.action !== 'DELETE' ? JSON.stringify(item.data) : undefined,
      });

      return response.ok;
    } catch (error) {
      console.error('Response sync failed:', error);
      return false;
    }
  }

  /**
   * Sync media files to server
   */
  private async syncMedia(item: any): Promise<boolean> {
    try {
      const apiUrl = '/api/v1/media';
      const method = item.action === 'CREATE' ? 'POST' : 
                    item.action === 'DELETE' ? 'DELETE' : 'POST';
      
      const url = item.action === 'DELETE' 
        ? `${apiUrl}/${item.entityId}` 
        : apiUrl;

      // For media, we might need to handle multipart form data
      const response = await fetch(url, {
        method,
        headers: item.action !== 'DELETE' ? undefined : { 'Content-Type': 'application/json' },
        body: item.action !== 'DELETE' ? this.createMediaFormData(item.data) : undefined,
      });

      return response.ok;
    } catch (error) {
      console.error('Media sync failed:', error);
      return false;
    }
  }

  /**
   * Sync incident data to server
   */
  private async syncIncident(item: any): Promise<boolean> {
    try {
      const apiUrl = '/api/v1/incidents';
      const method = item.action === 'CREATE' ? 'POST' : 
                    item.action === 'UPDATE' ? 'PUT' : 
                    item.action === 'DELETE' ? 'DELETE' : 'POST';
      
      const url = item.action === 'UPDATE' || item.action === 'DELETE' 
        ? `${apiUrl}/${item.entityId}` 
        : apiUrl;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: item.action !== 'DELETE' ? JSON.stringify(item.data) : undefined,
      });

      return response.ok;
    } catch (error) {
      console.error('Incident sync failed:', error);
      return false;
    }
  }

  /**
   * Sync entity data to server
   */
  private async syncEntity(item: any): Promise<boolean> {
    try {
      const apiUrl = '/api/v1/entities';
      const method = item.action === 'CREATE' ? 'POST' : 
                    item.action === 'UPDATE' ? 'PUT' : 
                    item.action === 'DELETE' ? 'DELETE' : 'POST';
      
      const url = item.action === 'UPDATE' || item.action === 'DELETE' 
        ? `${apiUrl}/${item.entityId}` 
        : apiUrl;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: item.action !== 'DELETE' ? JSON.stringify(item.data) : undefined,
      });

      return response.ok;
    } catch (error) {
      console.error('Entity sync failed:', error);
      return false;
    }
  }

  /**
   * Create FormData for media uploads
   */
  private createMediaFormData(data: any): FormData {
    const formData = new FormData();
    
    // Add file if present
    if (data.file) {
      formData.append('file', data.file);
    }
    
    // Add metadata
    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata));
    }
    
    // Add other fields
    Object.keys(data).forEach(key => {
      if (key !== 'file' && key !== 'metadata') {
        formData.append(key, data[key]);
      }
    });
    
    return formData;
  }

  /**
   * Process all pending items (useful for batch sync)
   */
  async processAllPending(): Promise<void> {
    try {
      const items = await this.getQueueItems({ status: 'PENDING' });
      
      for (const item of items) {
        try {
          await this.retryQueueItem(item.id);
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process pending items:', error);
      throw error;
    }
  }
}