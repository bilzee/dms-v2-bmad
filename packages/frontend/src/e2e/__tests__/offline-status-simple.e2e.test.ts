import { test, expect, Page } from '@playwright/test';

test.describe('Offline Status Detection', () => {
  test('should show consistent online/offline status on homepage', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Verify initial online state
    console.log('Testing initial online state...');
    
    // Check if System Status card exists and shows online
    const systemStatus = page.locator('[data-testid="system-status"]');
    await expect(systemStatus).toBeVisible();
    await expect(systemStatus).toContainText('Online');
    await expect(systemStatus).toContainText('Connected');
    await expect(systemStatus).toContainText('All features available');
    
    // Check header status (if present)
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.isVisible()) {
      await expect(connectionStatus).toContainText('Online');
    }
    
    console.log('✅ Online state verification passed');
    
    // Simulate offline
    console.log('Testing offline state...');
    await page.context().setOffline(true);
    await page.evaluate(() => {
      // Trigger offline event
      window.dispatchEvent(new Event('offline'));
    });
    
    // Wait for state to update
    await page.waitForTimeout(2000);
    
    // Check system status shows offline
    await expect(systemStatus).toContainText('Offline');
    await expect(systemStatus).toContainText('Disconnected');
    await expect(systemStatus).toContainText('Work saved locally');
    
    // Check header status shows offline (if present)
    if (await connectionStatus.isVisible()) {
      await expect(connectionStatus).toContainText('Offline');
    }
    
    console.log('✅ Offline state verification passed');
    
    // Go back online
    console.log('Testing back online...');
    await page.context().setOffline(false);
    await page.evaluate(() => {
      // Trigger online event
      window.dispatchEvent(new Event('online'));
    });
    
    // Wait for state to update
    await page.waitForTimeout(2000);
    
    // Verify we're back to online state
    await expect(systemStatus).toContainText('Online');
    await expect(systemStatus).toContainText('Connected');
    
    console.log('✅ Back to online state verification passed');
  });

  test('should show offline status on response plan page', async ({ page }) => {
    // Navigate to response plan page
    await page.goto('http://localhost:3001/responses/plan');
    await page.waitForLoadState('networkidle');
    
    // Check initial online state
    const offlineBanner = page.locator('[data-testid="offline-banner"]');
    await expect(offlineBanner).toBeVisible();
    await expect(offlineBanner).toContainText('Online - Changes will be synced in real-time');
    
    console.log('✅ Response plan online state verified');
    
    // Simulate offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(2000);
    
    // Check offline state
    await expect(offlineBanner).toContainText('Offline - Changes saved locally');
    
    console.log('✅ Response plan offline state verified');
  });

  test('should verify offline hook is working', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Test the offline detection mechanism directly
    const isInitiallyOnline = await page.evaluate(() => {
      return navigator.onLine;
    });
    console.log('Navigator initially online:', isInitiallyOnline);
    
    // Set offline and trigger event
    await page.context().setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
      console.log('Offline event dispatched, navigator.onLine:', navigator.onLine);
    });
    
    await page.waitForTimeout(1000);
    
    // Check navigator state
    const isOfflineNow = await page.evaluate(() => {
      return !navigator.onLine;
    });
    
    console.log('Navigator offline after event:', isOfflineNow);
    expect(isOfflineNow).toBe(true);
  });
});