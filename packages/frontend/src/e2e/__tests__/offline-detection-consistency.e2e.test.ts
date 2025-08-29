import { test, expect, Page } from '@playwright/test';

test.describe('Offline Detection Consistency', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3001');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should show consistent online status across all components', async () => {
    // Wait for page to load and ensure we're online
    await page.waitForLoadState('networkidle');
    
    // Check Header component shows online status
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Online');
    await expect(page.locator('[data-testid="queue-status"]')).toContainText('queued');
    
    // Check Homepage System Status shows online
    await expect(page.locator('[data-testid="system-status"]')).toContainText('Online');
    await expect(page.locator('[data-testid="system-status"]')).toContainText('Connected');
    await expect(page.locator('[data-testid="system-status"]')).toContainText('All features available');
    
    // Navigate to Response Planning page
    await page.goto('http://localhost:3001/responses/plan');
    await page.waitForLoadState('networkidle');
    
    // Check Response Plan page shows online status
    await expect(page.locator('[data-testid="offline-banner"]')).toContainText('Online - Changes will be synced in real-time');
  });

  test('should show consistent offline status when network is disabled', async () => {
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Simulate offline condition
    await page.context().setOffline(true);
    
    // Trigger offline detection by dispatching offline event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    // Wait a bit for state to update
    await page.waitForTimeout(1000);
    
    // Check Header component shows offline status
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Offline');
    await expect(page.locator('[data-testid="queue-status"]')).toContainText('queued');
    
    // Check Homepage System Status shows offline
    await expect(page.locator('[data-testid="system-status"]')).toContainText('Offline');
    await expect(page.locator('[data-testid="system-status"]')).toContainText('Disconnected');
    await expect(page.locator('[data-testid="system-status"]')).toContainText('Work saved locally');
    
    // Navigate to Response Planning page while offline
    await page.goto('http://localhost:3001/responses/plan');
    await page.waitForLoadState('domcontentloaded');
    
    // Check Response Plan page shows offline status
    await expect(page.locator('[data-testid="offline-banner"]')).toContainText('Offline - Changes saved locally');
  });

  test('should handle online/offline transitions smoothly', async () => {
    // Start online
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Online');
    
    // Go offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(1000);
    
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Offline');
    
    // Go back online
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(1000);
    
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Online');
  });

  test('should display queue information correctly in offline mode', async () => {
    // Go offline first
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(1000);
    
    // Navigate to assessment form to create offline items
    await page.goto('http://localhost:3001/assessments/new');
    await page.waitForLoadState('domcontentloaded');
    
    // Fill out a basic form (this should queue items)
    await page.fill('[name="title"]', 'Test Offline Assessment');
    await page.selectOption('[name="type"]', 'HEALTH');
    await page.fill('[name="location"]', 'Test Location');
    
    // Attempt to save (should go to queue)
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Return to homepage and check queue count
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(1000);
    
    // Queue should show > 0 items
    const queueText = await page.locator('[data-testid="queue-status"]').textContent();
    expect(queueText).toMatch(/[1-9]\d* queued/); // Should be 1 or more items
    
    // System status should mention queued items
    await expect(page.locator('[data-testid="system-status"]')).toContainText('will sync when connected');
  });

  test('should show consistent visual indicators (colors and icons)', async () => {
    // Test online visual indicators
    await page.waitForLoadState('networkidle');
    
    // Header should show green online indicator
    await expect(page.locator('[data-testid="connection-status"] .bg-green-50')).toBeVisible();
    await expect(page.locator('[data-testid="connection-status"] .text-green-700')).toBeVisible();
    
    // Homepage should show green status
    await expect(page.locator('[data-testid="system-status"] .bg-green-500')).toBeVisible();
    await expect(page.locator('[data-testid="system-status"] .text-green-700')).toBeVisible();
    
    // Go offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(1000);
    
    // Header should show orange offline indicator
    await expect(page.locator('[data-testid="connection-status"] .bg-orange-50')).toBeVisible();
    await expect(page.locator('[data-testid="connection-status"] .text-orange-700')).toBeVisible();
    
    // Homepage should show orange status
    await expect(page.locator('[data-testid="system-status"] .bg-orange-500')).toBeVisible();
    await expect(page.locator('[data-testid="system-status"] .text-orange-700')).toBeVisible();
  });
});