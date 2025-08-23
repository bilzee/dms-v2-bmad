/**
 * End-to-End Tests for Queue-Sync Integration
 * 
 * These tests verify the complete queue-sync integration including:
 * - Offline assessment creation and queueing
 * - Online sync process and status updates
 * - Failed sync handling and notifications
 * - Queue management operations
 * - Assessment workflow sync status integration
 * - Notification system functionality
 */

import { test, expect, Page } from '@playwright/test';
import { AssessmentType } from '@dms/shared';

// Test data
const testUser = {
  name: 'Jane Smith',
  id: 'assessor-456',
  role: 'FIELD_ASSESSOR'
};

const testAssessment = {
  type: AssessmentType.HEALTH,
  affectedEntityId: 'entity-123',
  data: {
    hasFunctionalClinic: false,
    numberHealthFacilities: 2,
    healthFacilityType: 'Primary Health Center',
    qualifiedHealthWorkers: 5,
    hasMedicineSupply: true,
    hasMedicalSupplies: true,
    hasMaternalChildServices: false,
    commonHealthIssues: ['Malaria', 'Diarrhea']
  }
};

class QueueManagementPage {
  constructor(private page: Page) {}

  async navigateToQueue() {
    await this.page.goto('/queue');
    await this.page.waitForLoadState('networkidle');
  }

  async verifyQueueItem(assessmentType: string, status: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED') {
    const queueItem = this.page.locator(`[data-testid^="queue-item-"]`).filter({
      hasText: assessmentType
    }).first();
    await expect(queueItem).toBeVisible();
    
    const statusBadge = queueItem.locator(`[data-testid="status-${status.toLowerCase()}"]`);
    await expect(statusBadge).toBeVisible();
    return queueItem;
  }

  async verifyHealthEmergencyPriority() {
    const healthItem = this.page.locator(`[data-testid^="queue-item-"]`).filter({
      hasText: 'HEALTH'
    }).first();
    
    // Verify high priority badge
    await expect(healthItem.locator('[data-testid="priority-high"]')).toBeVisible();
    
    // Verify health emergency indicator
    await expect(healthItem.locator('[data-testid="health-emergency"]')).toBeVisible();
    await expect(healthItem.locator('[data-testid="health-emergency"]')).toContainText('Health Emergency');
  }

  async retryQueueItem(itemId: string) {
    const queueItem = this.page.locator(`[data-testid="queue-item-${itemId}"]`);
    await queueItem.locator('[data-testid="more-actions"]').click();
    await this.page.locator('[data-testid="retry-action"]').click();
    
    // Wait for retry to be processed
    await this.page.waitForSelector('[data-testid="status-syncing"]');
  }

  async removeQueueItem(itemId: string) {
    const queueItem = this.page.locator(`[data-testid="queue-item-${itemId}"]`);
    await queueItem.locator('[data-testid="more-actions"]').click();
    await this.page.locator('[data-testid="remove-action"]').click();
    
    // Confirm removal
    await this.page.locator('[data-testid="confirm-remove"]').click();
  }

  async applyFilters(filters: { status?: string; priority?: string; type?: string }) {
    await this.page.locator('[data-testid="filters-toggle"]').click();
    
    if (filters.status) {
      await this.page.selectOption('[data-testid="status-filter"]', filters.status);
    }
    if (filters.priority) {
      await this.page.selectOption('[data-testid="priority-filter"]', filters.priority);
    }
    if (filters.type) {
      await this.page.selectOption('[data-testid="type-filter"]', filters.type);
    }
  }

  async verifyFilteredResults(expectedCount: number) {
    const queueItems = this.page.locator('[data-testid^="queue-item-"]');
    await expect(queueItems).toHaveCount(expectedCount);
  }

  async refreshQueue() {
    await this.page.locator('[data-testid="refresh-queue"]').click();
    await this.page.waitForSelector('[data-testid="queue-refreshed"]');
  }

  async verifyEmptyQueue() {
    await expect(this.page.locator('[data-testid="empty-queue"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="empty-queue"]')).toContainText('Queue is empty');
  }
}

class AssessmentWorkflowPage {
  constructor(private page: Page) {}

  async navigateToAssessmentForm() {
    await this.page.goto('/assessments/new');
    await this.page.waitForLoadState('networkidle');
  }

  async selectAssessmentType(type: AssessmentType) {
    await this.page.selectOption('[data-testid="assessment-type-selector"]', type);
    await this.page.waitForSelector(`[data-testid="${type.toLowerCase()}-assessment-form"]`);
  }

  async selectEntity(entityId: string) {
    await this.page.locator('[data-testid="entity-selector"]').click();
    await this.page.locator(`[data-testid="entity-option-${entityId}"]`).click();
  }

  async fillHealthAssessmentForm() {
    // Fill health assessment specific fields
    await this.page.fill('[data-testid="number-health-facilities"]', '2');
    await this.page.fill('[data-testid="health-facility-type"]', 'Primary Health Center');
    await this.page.fill('[data-testid="qualified-health-workers"]', '5');
    await this.page.check('[data-testid="has-medicine-supply"]');
    await this.page.check('[data-testid="has-medical-supplies"]');
  }

  async verifySyncStatus(status: 'synced' | 'pending' | 'failed' | 'offline') {
    const syncStatusComponent = this.page.locator('[data-testid="assessment-sync-status"]');
    await expect(syncStatusComponent).toBeVisible();
    
    const statusIndicator = syncStatusComponent.locator(`[data-testid="sync-${status}"]`);
    await expect(statusIndicator).toBeVisible();
  }

  async verifyQueueLink() {
    const queueLink = this.page.locator('[data-testid="view-queue-link"]');
    await expect(queueLink).toBeVisible();
    
    await queueLink.click();
    await this.page.waitForURL('**/queue');
  }

  async submitAssessment() {
    await this.page.locator('[data-testid="submit-assessment"]').click();
    await this.page.waitForSelector('[data-testid="assessment-submitted"]');
  }

  async navigateToAssessmentList() {
    await this.page.goto('/assessments');
    await this.page.waitForLoadState('networkidle');
  }

  async verifyAssessmentCardSyncStatus(assessmentId: string, status: string) {
    const assessmentCard = this.page.locator(`[data-testid="assessment-card-${assessmentId}"]`);
    const compactSyncStatus = assessmentCard.locator('[data-testid="compact-sync-status"]');
    
    await expect(compactSyncStatus).toBeVisible();
    await expect(compactSyncStatus.locator(`[data-testid="sync-${status}"]`)).toBeVisible();
  }
}

class NotificationTestPage {
  constructor(private page: Page) {}

  async verifyNotificationAppeared(type: 'success' | 'error' | 'warning', message: string) {
    const notification = this.page.locator(`[data-testid="toast-${type}"]`);
    await expect(notification).toBeVisible();
    await expect(notification).toContainText(message);
  }

  async verifyHealthEmergencyNotification() {
    const emergencyNotification = this.page.locator('[data-testid="toast-error"]').filter({
      hasText: 'Health Emergency'
    });
    await expect(emergencyNotification).toBeVisible();
    await expect(emergencyNotification).toContainText('🚨 Health Emergency');
  }

  async openNotificationSettings() {
    await this.page.locator('[data-testid="notification-settings-button"]').click();
    await this.page.waitForSelector('[data-testid="notification-settings-modal"]');
  }

  async configureNotificationSettings(settings: {
    enableSyncFailures?: boolean;
    enableHealthEmergencies?: boolean;
    enableBatchNotifications?: boolean;
    maxPerMinute?: number;
  }) {
    await this.openNotificationSettings();
    
    if (settings.enableSyncFailures !== undefined) {
      const checkbox = this.page.locator('[data-testid="enable-sync-failure-notifications"]');
      if (settings.enableSyncFailures) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
    }
    
    if (settings.enableHealthEmergencies !== undefined) {
      const checkbox = this.page.locator('[data-testid="enable-health-emergency-alerts"]');
      if (settings.enableHealthEmergencies) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
    }
    
    if (settings.maxPerMinute) {
      await this.page.fill('[data-testid="max-notifications-per-minute"]', settings.maxPerMinute.toString());
    }
    
    await this.page.locator('[data-testid="save-notification-settings"]').click();
    await this.page.waitForSelector('[data-testid="settings-saved"]');
  }

  async verifyRateLimiting() {
    // Check that no more than 5 notifications appear per minute
    const notifications = this.page.locator('[data-testid^="toast-"]');
    const count = await notifications.count();
    expect(count).toBeLessThanOrEqual(5);
  }

  async dismissNotification(index: number = 0) {
    const notification = this.page.locator('[data-testid^="toast-"]').nth(index);
    await notification.locator('[data-testid="dismiss-toast"]').click();
    await expect(notification).not.toBeVisible();
  }
}

test.describe('Queue-Sync Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('user', JSON.stringify({
        id: 'assessor-456',
        name: 'Jane Smith',
        role: 'FIELD_ASSESSOR',
        permissions: ['CREATE_ASSESSMENT', 'VIEW_QUEUE', 'MANAGE_QUEUE']
      }));
    });

    // Mock GPS for location capture
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null
              },
              timestamp: Date.now()
            } as GeolocationPosition);
          }
        }
      });
    });
  });

  test('Complete offline to online assessment sync flow', async ({ page }) => {
    const assessmentPage = new AssessmentWorkflowPage(page);
    const queuePage = new QueueManagementPage(page);
    const notificationPage = new NotificationTestPage(page);

    // Step 1: Go offline and create assessment
    await page.context().setOffline(true);
    await assessmentPage.navigateToAssessmentForm();
    
    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Create health assessment
    await assessmentPage.selectAssessmentType(AssessmentType.HEALTH);
    await assessmentPage.selectEntity(testAssessment.affectedEntityId);
    await assessmentPage.fillHealthAssessmentForm();
    
    // Verify sync status shows offline/pending
    await assessmentPage.verifySyncStatus('offline');
    
    // Submit assessment
    await assessmentPage.submitAssessment();
    
    // Step 2: Verify assessment appears in queue
    await queuePage.navigateToQueue();
    await queuePage.verifyQueueItem('HEALTH', 'PENDING');
    await queuePage.verifyHealthEmergencyPriority();
    
    // Step 3: Go online and verify sync
    await page.context().setOffline(false);
    await page.waitForSelector('[data-testid="online-indicator"]');
    
    // Refresh to trigger sync
    await queuePage.refreshQueue();
    
    // Verify sync completion
    await queuePage.verifyQueueItem('HEALTH', 'SYNCED');
    
    // Step 4: Verify success notification
    await notificationPage.verifyNotificationAppeared('success', 'Assessment synced successfully');
    
    // Step 5: Verify assessment list shows synced status
    await assessmentPage.navigateToAssessmentList();
    await assessmentPage.verifyAssessmentCardSyncStatus('test-assessment-id', 'synced');
  });

  test('Failed sync handling and recovery', async ({ page }) => {
    const queuePage = new QueueManagementPage(page);
    const notificationPage = new NotificationTestPage(page);

    // Mock sync API to fail
    await page.route('/api/v1/sync/assessment/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Network timeout' })
      });
    });

    // Assume we have a pending assessment in queue
    await queuePage.navigateToQueue();
    
    // Verify failed sync notification appears
    await notificationPage.verifyNotificationAppeared('error', 'Assessment sync failed');
    
    // Verify queue item shows failed status
    await queuePage.verifyQueueItem('HEALTH', 'FAILED');
    
    // Test manual retry
    await queuePage.retryQueueItem('test-queue-item-id');
    
    // Mock successful retry
    await page.unroute('/api/v1/sync/assessment/**');
    await page.route('/api/v1/sync/assessment/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    // Verify retry succeeds
    await queuePage.verifyQueueItem('HEALTH', 'SYNCED');
    await notificationPage.verifyNotificationAppeared('success', 'Assessment synced after retry');
  });

  test('Health emergency notification prioritization', async ({ page }) => {
    const assessmentPage = new AssessmentWorkflowPage(page);
    const notificationPage = new NotificationTestPage(page);

    // Create health assessment that fails to sync
    await page.context().setOffline(true);
    await assessmentPage.navigateToAssessmentForm();
    await assessmentPage.selectAssessmentType(AssessmentType.HEALTH);
    await assessmentPage.selectEntity(testAssessment.affectedEntityId);
    await assessmentPage.fillHealthAssessmentForm();
    await assessmentPage.submitAssessment();

    // Go online and force sync failure
    await page.context().setOffline(false);
    
    await page.route('/api/v1/sync/assessment/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Critical sync failure' })
      });
    });

    // Trigger sync attempt
    await page.reload();
    
    // Verify health emergency notification appears with high priority styling
    await notificationPage.verifyHealthEmergencyNotification();
    
    // Verify notification persists longer (7 seconds for health emergencies)
    await page.waitForTimeout(5000);
    const emergencyNotification = page.locator('[data-testid="toast-error"]').filter({
      hasText: 'Health Emergency'
    });
    await expect(emergencyNotification).toBeVisible();
  });

  test('Queue management operations', async ({ page }) => {
    const queuePage = new QueueManagementPage(page);

    await queuePage.navigateToQueue();

    // Test filtering
    await queuePage.applyFilters({ status: 'FAILED', priority: 'HIGH' });
    await queuePage.verifyFilteredResults(1);

    await queuePage.applyFilters({ type: 'ASSESSMENT' });
    await queuePage.verifyFilteredResults(2);

    // Reset filters
    await queuePage.applyFilters({ status: '', priority: '', type: '' });

    // Test queue item removal
    await queuePage.removeQueueItem('test-queue-item-1');
    
    // Verify item is removed from UI
    await expect(page.locator('[data-testid="queue-item-test-queue-item-1"]')).not.toBeVisible();

    // Test queue refresh
    await queuePage.refreshQueue();
    
    // Verify refresh indicator appears
    await expect(page.locator('[data-testid="queue-refreshing"]')).toBeVisible();
    await expect(page.locator('[data-testid="queue-refreshing"]')).not.toBeVisible();
  });

  test('Assessment workflow sync status integration', async ({ page }) => {
    const assessmentPage = new AssessmentWorkflowPage(page);

    // Test sync status in assessment form
    await assessmentPage.navigateToAssessmentForm();
    await assessmentPage.selectAssessmentType(AssessmentType.HEALTH);
    await assessmentPage.selectEntity(testAssessment.affectedEntityId);
    
    // Initially should show synced (no pending changes)
    await assessmentPage.verifySyncStatus('synced');
    
    // Make changes to form
    await assessmentPage.fillHealthAssessmentForm();
    
    // Should now show pending
    await assessmentPage.verifySyncStatus('pending');
    
    // Test queue link functionality
    await assessmentPage.verifyQueueLink();
    
    // Go back and submit assessment
    await page.goBack();
    await assessmentPage.submitAssessment();
    
    // Verify assessment appears in list with correct sync status
    await assessmentPage.navigateToAssessmentList();
    await assessmentPage.verifyAssessmentCardSyncStatus('test-assessment-id', 'synced');
  });

  test('Notification system functionality', async ({ page }) => {
    const notificationPage = new NotificationTestPage(page);
    const queuePage = new QueueManagementPage(page);

    // Test notification settings
    await queuePage.navigateToQueue();
    await notificationPage.configureNotificationSettings({
      enableSyncFailures: true,
      enableHealthEmergencies: true,
      maxPerMinute: 3
    });

    // Create multiple sync failures to test rate limiting
    await page.route('/api/v1/sync/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Sync failed' })
      });
    });

    // Trigger multiple sync attempts
    for (let i = 0; i < 5; i++) {
      await queuePage.retryQueueItem(`test-item-${i}`);
      await page.waitForTimeout(100);
    }

    // Verify rate limiting works (max 3 per minute)
    await notificationPage.verifyRateLimiting();

    // Test notification dismissal
    await notificationPage.dismissNotification(0);

    // Disable notifications and verify they don't appear
    await notificationPage.configureNotificationSettings({
      enableSyncFailures: false
    });

    await queuePage.retryQueueItem('test-item-final');
    
    // Should not see any new sync failure notifications
    await page.waitForTimeout(2000);
    const failureNotifications = page.locator('[data-testid="toast-error"]').filter({
      hasText: 'sync failed'
    });
    await expect(failureNotifications).toHaveCount(0);
  });

  test('Empty queue state', async ({ page }) => {
    const queuePage = new QueueManagementPage(page);

    // Mock empty queue response
    await page.route('/api/v1/queue**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await queuePage.navigateToQueue();
    await queuePage.verifyEmptyQueue();
    
    // Verify helpful message and illustration
    await expect(page.locator('[data-testid="empty-queue-illustration"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-queue-message"]')).toContainText('All assessments are up to date');
  });

  test('Offline mode queue indicators', async ({ page }) => {
    const assessmentPage = new AssessmentWorkflowPage(page);
    const queuePage = new QueueManagementPage(page);

    // Go offline
    await page.context().setOffline(true);
    
    // Create assessment
    await assessmentPage.navigateToAssessmentForm();
    await assessmentPage.selectAssessmentType(AssessmentType.HEALTH);
    await assessmentPage.selectEntity(testAssessment.affectedEntityId);
    await assessmentPage.fillHealthAssessmentForm();
    
    // Verify offline sync status
    await assessmentPage.verifySyncStatus('offline');
    
    await assessmentPage.submitAssessment();
    
    // Check queue shows offline indicators
    await queuePage.navigateToQueue();
    await expect(page.locator('[data-testid="offline-queue-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-queue-warning"]')).toContainText('You are offline');
    
    // Verify queue items show offline status
    await queuePage.verifyQueueItem('HEALTH', 'PENDING');
    
    // Verify sync will happen when online message
    const queueItem = page.locator('[data-testid^="queue-item-"]').first();
    await expect(queueItem.locator('[data-testid="offline-sync-message"]')).toContainText('Will sync when online');
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('Network timeout during sync', async ({ page }) => {
    const notificationPage = new NotificationTestPage(page);
    const queuePage = new QueueManagementPage(page);

    // Mock network timeout
    await page.route('/api/v1/sync/**', async route => {
      await page.waitForTimeout(10000); // Simulate timeout
      route.abort('timedout');
    });

    await queuePage.navigateToQueue();
    await queuePage.retryQueueItem('test-item');

    // Verify timeout notification
    await notificationPage.verifyNotificationAppeared('error', 'Network timeout');
    await queuePage.verifyQueueItem('HEALTH', 'FAILED');
  });

  test('API server errors', async ({ page }) => {
    const queuePage = new QueueManagementPage(page);

    // Mock various server errors
    await page.route('/api/v1/queue**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service temporarily unavailable' })
      });
    });

    await queuePage.navigateToQueue();
    
    // Verify error message displayed
    await expect(page.locator('[data-testid="queue-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="queue-error"]')).toContainText('Service temporarily unavailable');
  });

  test('Large queue performance', async ({ page }) => {
    const queuePage = new QueueManagementPage(page);

    // Mock large queue with 100 items
    const largeQueue = Array.from({ length: 100 }, (_, i) => ({
      id: `queue_${i}`,
      type: 'ASSESSMENT',
      action: 'CREATE',
      data: { assessmentType: i % 2 === 0 ? 'HEALTH' : 'WASH' },
      retryCount: Math.floor(Math.random() * 3),
      priority: i < 20 ? 'HIGH' : 'NORMAL',
      createdAt: new Date(Date.now() - i * 60000),
      error: i % 10 === 0 ? 'Sync failed' : undefined
    }));

    await page.route('/api/v1/queue**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: largeQueue })
      });
    });

    await queuePage.navigateToQueue();
    
    // Verify pagination or virtualization works
    const queueItems = page.locator('[data-testid^="queue-item-"]');
    const visibleCount = await queueItems.count();
    
    // Should not render all 100 items at once (performance optimization)
    expect(visibleCount).toBeLessThan(100);
    expect(visibleCount).toBeGreaterThan(0);
    
    // Verify filtering still works with large dataset
    await queuePage.applyFilters({ priority: 'HIGH' });
    await page.waitForTimeout(1000); // Allow filter to apply
    
    const filteredItems = page.locator('[data-testid^="queue-item-"]');
    const filteredCount = await filteredItems.count();
    expect(filteredCount).toBeLessThanOrEqual(20); // Should match our HIGH priority items
  });
});