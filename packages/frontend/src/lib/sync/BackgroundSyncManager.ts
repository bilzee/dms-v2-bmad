/**
 * BackgroundSyncManager Service
 * 
 * Orchestrates background synchronization operations by coordinating:
 * - ConnectivityDetector for network monitoring
 * - Service Worker background sync events
 * - Existing BullMQ/OfflineQueueService infrastructure
 * - Intelligent batching and throttling
 * - Progress tracking and error recovery
 */

import { connectivityDetector, ConnectivityStatus } from './ConnectivityDetector';
import { OfflineQueueService } from '../services/OfflineQueueService';
import type { PriorityQueueItem } from '@dms/shared';
import type {} from '../../types/service-worker.d.ts';

export interface BackgroundSyncSettings {
  enabled: boolean;
  syncOnlyWhenCharging: boolean;
  minimumBatteryLevel: number; // Default: 20%
  maximumConcurrentOperations: number; // Default: 3
  syncIntervalMinutes: number; // Default: 5
  maxRetryAttempts: number; // Default: 5
  priorityThreshold: 'HIGH' | 'NORMAL' | 'LOW'; // Minimum priority for background sync
}

export interface BackgroundSyncProgress {
  totalItems: number;
  completedItems: number;
  failedItems: number;
  currentOperation?: {
    type: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA' | 'INCIDENT' | 'ENTITY';
    entityId: string;
    progress: number; // 0-100
    estimatedTimeRemaining?: number; // seconds
  };
  lastSyncAttempt: Date;
  nextScheduledSync: Date;
  averageSyncDuration: number; // seconds
}

export interface SyncMetrics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  totalDataSynced: number; // bytes
  networkUsage: number; // bytes
  batteryUsed: number; // percentage
  errors: string[];
}

export interface BackgroundSyncCallback {
  onProgress?: (progress: BackgroundSyncProgress) => void;
  onComplete?: (metrics: SyncMetrics) => void;
  onError?: (error: string) => void;
}

export class BackgroundSyncManager {
  private queueService: OfflineQueueService;
  private settings: BackgroundSyncSettings;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private callbacks: Set<BackgroundSyncCallback> = new Set();
  private currentProgress: BackgroundSyncProgress | null = null;
  private currentMetrics: SyncMetrics | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  // Exponential backoff state
  private backoffMultiplier: number = 1;
  private maxBackoffMinutes: number = 60;
  private lastFailureTime: Date | null = null;

  // Performance tracking
  private syncHistoryBuffer: SyncMetrics[] = [];
  private maxHistorySize: number = 50;

  constructor(settings?: Partial<BackgroundSyncSettings>) {
    this.queueService = new OfflineQueueService();
    this.settings = {
      enabled: true,
      syncOnlyWhenCharging: false,
      minimumBatteryLevel: 20,
      maximumConcurrentOperations: 3,
      syncIntervalMinutes: 5,
      maxRetryAttempts: 5,
      priorityThreshold: 'LOW',
      ...settings,
    };

    this.initializeBackgroundSync();
  }

  /**
   * Initialize background sync functionality
   */
  private async initializeBackgroundSync(): Promise<void> {
    // Register service worker for true background sync
    await this.registerServiceWorker();

    // Setup connectivity monitoring
    connectivityDetector.onConnectivityChange((status) => {
      this.onConnectivityChange(status);
    });

    // Start automatic sync scheduling if enabled
    if (this.settings.enabled) {
      this.startAutoSync();
    }
  }

  /**
   * Register service worker for background sync events
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event);
        });

        // Register for background sync if supported
        if ('sync' in window.ServiceWorkerRegistration.prototype) {
          await this.setupBackgroundSyncEvents();
        }
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    }
  }

  /**
   * Setup service worker background sync event handling
   */
  private async setupBackgroundSyncEvents(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      // Register for sync events with different tags for priority
      await this.serviceWorkerRegistration.sync.register('background-sync-high');
      await this.serviceWorkerRegistration.sync.register('background-sync-normal');
      await this.serviceWorkerRegistration.sync.register('background-sync-low');
    } catch (error) {
      console.warn('Background sync registration failed:', error);
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data;

    switch (type) {
      case 'BACKGROUND_SYNC_START':
        this.handleBackgroundSyncStart(payload);
        break;
      case 'BACKGROUND_SYNC_PROGRESS':
        this.handleProgressUpdate(payload);
        break;
      case 'BACKGROUND_SYNC_COMPLETE':
        this.handleBackgroundSyncComplete(payload);
        break;
      case 'BACKGROUND_SYNC_ERROR':
        this.handleBackgroundSyncError(payload);
        break;
    }
  }

  /**
   * Handle progress updates from service worker
   */
  private handleProgressUpdate(payload: any): void {
    if (this.currentProgress) {
      // Update current progress with payload data
      this.currentProgress = {
        ...this.currentProgress,
        completedItems: payload.succeeded || this.currentProgress.completedItems,
        failedItems: payload.failed || this.currentProgress.failedItems,
        currentOperation: payload.currentItem ? {
          type: payload.currentItem.type,
          entityId: payload.currentItem.entityId || payload.currentItem.id,
          progress: Math.round((payload.processed / payload.total) * 100),
          estimatedTimeRemaining: this.estimateTimeRemaining(payload.currentItem),
        } : undefined,
      };
      
      // Notify callbacks of progress update
      this.notifyCallbacks('onProgress', this.currentProgress);
    }
  }

  /**
   * Handle connectivity changes from ConnectivityDetector
   */
  private onConnectivityChange(status: ConnectivityStatus): void {
    if (status.isOnline && this.shouldTriggerSync(status)) {
      // Trigger immediate sync on connectivity recovery
      this.triggerImmediateSync('connectivity_recovery');
    } else if (!status.isOnline) {
      // Pause active sync operations when offline
      this.pauseActiveOperations();
    }
  }

  /**
   * Determine if connectivity change should trigger sync
   */
  private shouldTriggerSync(status: ConnectivityStatus): boolean {
    // Don't sync if disabled or paused
    if (!this.settings.enabled || this.isPaused) return false;

    // Check connectivity suitability
    if (!connectivityDetector.isGoodForSync()) return false;

    // Check battery constraints
    if (this.settings.syncOnlyWhenCharging && !status.isCharging) return false;
    if (status.batteryLevel !== undefined && status.batteryLevel < this.settings.minimumBatteryLevel) {
      return false;
    }

    // Check if we're in backoff period
    if (this.isInBackoffPeriod()) return false;

    return true;
  }

  /**
   * Check if we're currently in exponential backoff period
   */
  private isInBackoffPeriod(): boolean {
    if (!this.lastFailureTime) return false;
    
    const backoffDuration = Math.min(
      this.backoffMultiplier * 5 * 60 * 1000, // Base 5 minutes, exponentially increased
      this.maxBackoffMinutes * 60 * 1000 // Cap at maxBackoffMinutes
    );
    
    return (Date.now() - this.lastFailureTime.getTime()) < backoffDuration;
  }

  /**
   * Start automatic sync scheduling
   */
  public startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    const intervalMs = this.settings.syncIntervalMinutes * 60 * 1000;
    this.syncInterval = setInterval(() => {
      this.attemptBackgroundSync('scheduled');
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop automatic sync scheduling
   */
  public stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Pause background sync operations
   */
  public pause(): void {
    this.isPaused = true;
    this.pauseActiveOperations();
  }

  /**
   * Resume background sync operations
   */
  public resume(): void {
    this.isPaused = false;
    if (this.settings.enabled && connectivityDetector.isGoodForSync()) {
      this.triggerImmediateSync('manual_resume');
    }
  }

  /**
   * Pause currently active sync operations
   */
  private pauseActiveOperations(): void {
    // Signal service worker to pause operations
    if (this.serviceWorkerRegistration) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'PAUSE_BACKGROUND_SYNC'
      });
    }
  }

  /**
   * Trigger immediate background sync
   */
  public async triggerImmediateSync(reason: string): Promise<void> {
    if (!this.shouldTriggerSync(connectivityDetector.getStatus())) {
      console.log('Background sync conditions not met');
      return;
    }

    await this.attemptBackgroundSync(reason);
  }

  /**
   * Main background sync orchestration method
   */
  private async attemptBackgroundSync(trigger: string): Promise<void> {
    if (this.isRunning && !this.isPaused) {
      console.log('Background sync already running');
      return;
    }

    try {
      this.isRunning = true;
      await this.performBackgroundSync(trigger);
      this.resetBackoff(); // Reset backoff on success
    } catch (error) {
      this.handleSyncFailure(error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Perform the actual background sync process
   */
  private async performBackgroundSync(trigger: string): Promise<void> {
    // Initialize metrics tracking
    this.currentMetrics = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      totalDataSynced: 0,
      networkUsage: 0,
      batteryUsed: 0,
      errors: [],
    };

    // Get items to sync based on priority threshold
    const itemsToSync = await this.getItemsForBackgroundSync();
    
    if (itemsToSync.length === 0) {
      console.log('No items to sync in background');
      return;
    }

    // Initialize progress tracking
    this.currentProgress = {
      totalItems: itemsToSync.length,
      completedItems: 0,
      failedItems: 0,
      lastSyncAttempt: new Date(),
      nextScheduledSync: this.calculateNextSyncTime(),
      averageSyncDuration: this.calculateAverageSyncDuration(),
    };

    // Notify callbacks of sync start
    this.notifyCallbacks('onProgress', this.currentProgress);

    // Process items in batches with concurrency control
    await this.processSyncBatch(itemsToSync);

    // Complete metrics and notify
    this.currentMetrics.endTime = new Date();
    this.addToSyncHistory(this.currentMetrics);
    this.notifyCallbacks('onComplete', this.currentMetrics);
  }

  /**
   * Get queue items eligible for background sync
   */
  private async getItemsForBackgroundSync(): Promise<PriorityQueueItem[]> {
    try {
      // Get pending items from queue
      const allItems = await this.queueService.getQueueItems({ status: 'PENDING' });
      
      // Filter by priority threshold
      const priorityOrder = { HIGH: 3, NORMAL: 2, LOW: 1 };
      const thresholdValue = priorityOrder[this.settings.priorityThreshold];
      
      const eligibleItems = allItems.filter(item => {
        const itemPriority = priorityOrder[item.priority as keyof typeof priorityOrder] || 0;
        return itemPriority >= thresholdValue;
      }).map(item => ({
        ...item,
        priorityScore: (item as any).priorityScore ?? 0,      // Provide defaults for optional properties
        priorityReason: (item as any).priorityReason ?? 'Background sync priority'
      })) as PriorityQueueItem[];  // Explicit type assertion

      // Sort by priority score (if available) and creation date
      return eligibleItems.sort((a, b) => {
        const scoreA = (a as any).priorityScore || 0;
        const scoreB = (b as any).priorityScore || 0;
        
        if (scoreA !== scoreB) return scoreB - scoreA; // Higher scores first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Newer first
      });
    } catch (error) {
      console.error('Failed to get items for background sync:', error);
      return [];
    }
  }

  /**
   * Process sync items in controlled batches
   */
  private async processSyncBatch(items: PriorityQueueItem[]): Promise<void> {
    const batchSize = Math.min(this.settings.maximumConcurrentOperations, items.length);
    
    for (let i = 0; i < items.length; i += batchSize) {
      // Check if we should continue (connectivity, battery, etc.)
      if (!this.shouldContinueSync()) {
        console.log('Stopping background sync due to changed conditions');
        break;
      }

      const batch = items.slice(i, i + batchSize);
      const promises = batch.map(item => this.processSyncItem(item));
      
      await Promise.allSettled(promises);

      // Update progress after each batch
      this.updateProgressAfterBatch();
      
      // Small delay between batches to prevent overwhelming
      if (i + batchSize < items.length) {
        await this.sleep(100);
      }
    }
  }

  /**
   * Process a single sync item
   */
  private async processSyncItem(item: PriorityQueueItem): Promise<void> {
    if (!this.currentProgress || !this.currentMetrics) return;

    // Update current operation
    this.currentProgress.currentOperation = {
      type: item.type as any,
      entityId: item.entityId || item.id,
      progress: 0,
      estimatedTimeRemaining: this.estimateTimeRemaining(item),
    };

    try {
      // Perform the sync operation
      await this.queueService.retryQueueItem(item.id);
      
      // Update metrics on success
      this.currentMetrics.itemsSucceeded++;
      this.currentProgress.completedItems++;
      
    } catch (error) {
      // Update metrics on failure
      this.currentMetrics.itemsFailed++;
      this.currentProgress.failedItems++;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.currentMetrics.errors.push(`${item.id}: ${errorMessage}`);
      
      console.error(`Background sync failed for item ${item.id}:`, error);
    } finally {
      this.currentMetrics.itemsProcessed++;
      this.currentProgress.currentOperation = undefined;
    }
  }

  /**
   * Check if sync should continue based on current conditions
   */
  private shouldContinueSync(): boolean {
    // Check pause state
    if (this.isPaused) return false;

    // Check connectivity
    const status = connectivityDetector.getStatus();
    if (!status.isOnline) return false;

    // Check battery constraints
    if (this.settings.syncOnlyWhenCharging && !status.isCharging) return false;
    if (status.batteryLevel !== undefined && status.batteryLevel < this.settings.minimumBatteryLevel) {
      return false;
    }

    // Check connection quality
    if (status.connectionQuality === 'poor') return false;

    return true;
  }

  /**
   * Update progress after processing a batch
   */
  private updateProgressAfterBatch(): void {
    if (!this.currentProgress) return;

    // Update next scheduled sync time
    this.currentProgress.nextScheduledSync = this.calculateNextSyncTime();
    
    // Notify callbacks of progress
    this.notifyCallbacks('onProgress', this.currentProgress);
  }

  /**
   * Estimate time remaining for a sync item
   */
  private estimateTimeRemaining(item: PriorityQueueItem): number {
    // Base estimate on item type and size
    const baseTime = {
      'ASSESSMENT': 2000,
      'RESPONSE': 1500,
      'MEDIA': 5000,
      'INCIDENT': 2500,
      'ENTITY': 1000,
    }[item.type] || 2000; // Default 2 seconds

    // Adjust based on connection quality
    const connectionMultiplier = {
      'excellent': 1,
      'good': 1.5,
      'poor': 3,
      'offline': 0, // Shouldn't sync when offline
    }[connectivityDetector.getStatus().connectionQuality] || 1.5;

    return Math.round(baseTime * connectionMultiplier / 1000); // Convert to seconds
  }

  /**
   * Calculate next scheduled sync time
   */
  private calculateNextSyncTime(): Date {
    const baseInterval = this.settings.syncIntervalMinutes * 60 * 1000;
    let nextTime = new Date(Date.now() + baseInterval);

    // Apply exponential backoff if in failure state
    if (this.isInBackoffPeriod()) {
      const backoffDuration = Math.min(
        this.backoffMultiplier * 5 * 60 * 1000,
        this.maxBackoffMinutes * 60 * 1000
      );
      nextTime = new Date(Date.now() + backoffDuration);
    }

    return nextTime;
  }

  /**
   * Calculate average sync duration from history
   */
  private calculateAverageSyncDuration(): number {
    if (this.syncHistoryBuffer.length === 0) return 30; // Default 30 seconds

    const totalDuration = this.syncHistoryBuffer.reduce((sum, metrics) => {
      if (metrics.endTime) {
        return sum + (metrics.endTime.getTime() - metrics.startTime.getTime());
      }
      return sum;
    }, 0);

    return Math.round(totalDuration / this.syncHistoryBuffer.length / 1000); // Convert to seconds
  }

  /**
   * Handle sync failure with exponential backoff
   */
  private handleSyncFailure(error: any): void {
    this.lastFailureTime = new Date();
    this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 32); // Cap at 32x

    const errorMessage = error instanceof Error ? error.message : 'Background sync failed';
    console.error('Background sync failed:', error);
    
    this.notifyCallbacks('onError', errorMessage);
  }

  /**
   * Reset exponential backoff on successful sync
   */
  private resetBackoff(): void {
    this.lastFailureTime = null;
    this.backoffMultiplier = 1;
  }

  /**
   * Add completed sync metrics to history
   */
  private addToSyncHistory(metrics: SyncMetrics): void {
    this.syncHistoryBuffer.push(metrics);
    
    // Keep only recent history
    if (this.syncHistoryBuffer.length > this.maxHistorySize) {
      this.syncHistoryBuffer.shift();
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `bg-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Notify registered callbacks
   */
  private notifyCallbacks(
    callbackType: keyof BackgroundSyncCallback,
    payload: any
  ): void {
    this.callbacks.forEach(callback => {
      const fn = callback[callbackType];
      if (fn) {
        try {
          fn(payload);
        } catch (error) {
          console.error(`Background sync callback error (${callbackType}):`, error);
        }
      }
    });
  }

  // Event handlers from service worker messages
  private handleBackgroundSyncStart(payload: any): void {
    console.log('Service worker background sync started:', payload);
  }

  private handleBackgroundSyncComplete(payload: any): void {
    console.log('Service worker background sync completed:', payload);
  }

  private handleBackgroundSyncError(payload: any): void {
    console.error('Service worker background sync error:', payload);
    this.handleSyncFailure(new Error(payload.error || 'Service worker sync failed'));
  }

  // Public API methods

  /**
   * Subscribe to background sync events
   */
  public subscribe(callback: BackgroundSyncCallback): () => void {
    this.callbacks.add(callback);
    
    // Provide current state immediately if available
    if (this.currentProgress) {
      callback.onProgress?.(this.currentProgress);
    }

    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Update background sync settings
   */
  public updateSettings(newSettings: Partial<BackgroundSyncSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Restart auto-sync with new settings if enabled
    if (this.settings.enabled && this.isRunning) {
      this.stopAutoSync();
      this.startAutoSync();
    } else if (!this.settings.enabled && this.isRunning) {
      this.stopAutoSync();
    } else if (this.settings.enabled && !this.isRunning) {
      this.startAutoSync();
    }
  }

  /**
   * Get current settings
   */
  public getSettings(): BackgroundSyncSettings {
    return { ...this.settings };
  }

  /**
   * Get current sync progress
   */
  public getProgress(): BackgroundSyncProgress | null {
    return this.currentProgress ? { ...this.currentProgress } : null;
  }

  /**
   * Get sync metrics history
   */
  public getSyncHistory(): SyncMetrics[] {
    return [...this.syncHistoryBuffer];
  }

  /**
   * Get current sync status
   */
  public getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    isEnabled: boolean;
    canSync: boolean;
    nextScheduledSync?: Date;
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isEnabled: this.settings.enabled,
      canSync: this.shouldTriggerSync(connectivityDetector.getStatus()),
      nextScheduledSync: this.currentProgress?.nextScheduledSync,
    };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopAutoSync();
    this.callbacks.clear();
    this.currentProgress = null;
    this.currentMetrics = null;
  }
}

// Export singleton instance for app-wide usage
export const backgroundSyncManager = new BackgroundSyncManager();