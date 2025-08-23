import { test, expect } from '@playwright/test';

test.describe('Response Planning Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to response planning page
    await page.goto('/responses/plan');
    await page.waitForLoadState('networkidle');
  });

  test('complete response planning workflow - health response', async ({ page }) => {
    // Test Step 1: Select response type
    await test.step('Select Health response type', async () => {
      await page.click('text=Health');
      await expect(page.locator('.bg-red-50')).toBeVisible();
    });

    // Test Step 2: Select affected entity
    await test.step('Select affected entity', async () => {
      await page.click('text=Select Affected Entity');
      await page.fill('input[placeholder*="Search by entity"]', 'Test Camp');
      await page.click('text=Test Camp');
      await expect(page.locator('text=Test Camp')).toBeVisible();
    });

    // Test Step 3: Link assessment (optional)
    await test.step('Link related assessment', async () => {
      await page.click('text=Link Assessment');
      await page.click('text=HEALTH Assessment');
      await expect(page.locator('text=HEALTH Assessment')).toBeVisible();
    });

    // Test Step 4: Plan delivery timeline
    await test.step('Set delivery timeline', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      await page.fill('input[type="date"]', dateString);
      await page.fill('input[type="time"]', '08:00');
      await page.fill('input[id="deliveryDuration"]', '120');
    });

    // Test Step 5: Add items using templates
    await test.step('Add response items', async () => {
      await page.click('text=Show Templates');
      await page.click('text=Add >> nth=0'); // Add first template item
      
      // Add custom item
      await page.click('text=Add Item');
      const lastItemRow = page.locator('.grid.grid-cols-12').last();
      await lastItemRow.locator('input[placeholder*="Enter item name"]').fill('Custom Medicine');
      await lastItemRow.locator('input[type="number"]').fill('50');
      await lastItemRow.locator('input[placeholder*="Unit"]').fill('tablets');
    });

    // Test Step 6: Fill health-specific fields
    await test.step('Fill health response details', async () => {
      await page.fill('input[name*="healthWorkersDeployed"]', '3');
      await page.fill('input[name*="patientsTreated"]', '0');
    });

    // Test Step 7: Add notes
    await test.step('Add additional notes', async () => {
      await page.fill('textarea[placeholder*="additional notes"]', 
        'Mobile clinic deployment with emphasis on maternal health services');
    });

    // Test Step 8: Save draft (auto-save test)
    await test.step('Verify auto-save functionality', async () => {
      // Wait for auto-save indicator
      await expect(page.locator('text=Auto-saving')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Last saved')).toBeVisible({ timeout: 5000 });
    });

    // Test Step 9: Submit response plan
    await test.step('Submit response plan', async () => {
      await page.click('text=Submit Response Plan');
      
      // Should show success message
      await expect(page.locator('text=Response Plan Created!')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Redirecting to responses list')).toBeVisible();
    });
  });

  test('offline functionality test', async ({ page, context }) => {
    // Simulate offline mode
    await context.setOffline(true);

    await test.step('Verify offline indicator', async () => {
      await expect(page.locator('text=Offline')).toBeVisible();
      await expect(page.locator('text=saved locally and synced when online')).toBeVisible();
    });

    await test.step('Create response plan offline', async () => {
      // Select response type
      await page.click('text=WASH');
      
      // Select entity
      await page.click('text=Select Affected Entity');
      await page.click('text=Test Community >> nth=0');
      
      // Fill basic details
      await page.fill('input[name*="waterDeliveredLiters"]', '2000');
      await page.fill('input[name*="hygieneKitsDistributed"]', '50');
      
      // Submit plan
      await page.click('text=Submit Response Plan');
      
      // Should still work offline and show success
      await expect(page.locator('text=Response Plan Created!')).toBeVisible({ timeout: 10000 });
    });

    // Restore online mode
    await context.setOffline(false);
    
    await test.step('Verify sync when back online', async () => {
      await page.reload();
      await expect(page.locator('text=Online')).toBeVisible();
    });
  });

  test('form validation and error handling', async ({ page }) => {
    await test.step('Test required field validation', async () => {
      // Try to submit without selecting entity
      await page.click('text=Submit Response Plan');
      
      // Should be disabled or show validation error
      const submitButton = page.locator('text=Submit Response Plan');
      await expect(submitButton).toBeDisabled();
    });

    await test.step('Test invalid data validation', async () => {
      // Fill invalid date (past date)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0];
      
      await page.fill('input[type="date"]', dateString);
      
      // Should show validation error
      await expect(page.locator('text=cannot be in the past')).toBeVisible();
    });

    await test.step('Test error recovery', async () => {
      // Clear error by fixing the date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      await page.fill('input[type="date"]', dateString);
      
      // Error should be cleared
      await expect(page.locator('text=cannot be in the past')).not.toBeVisible();
    });
  });

  test('response type switching maintains form state', async ({ page }) => {
    await test.step('Fill common fields', async () => {
      // Select entity
      await page.click('text=Select Affected Entity');
      await page.click('text=Test Camp >> nth=0');
      
      // Set timeline
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      await page.fill('input[type="date"]', dateString);
      await page.fill('input[type="time"]', '09:00');
    });

    await test.step('Switch between response types', async () => {
      // Start with Health
      await page.click('text=Health');
      await page.fill('input[name*="healthWorkersDeployed"]', '2');
      
      // Switch to WASH
      await page.click('text=WASH');
      await expect(page.locator('input[name*="waterDeliveredLiters"]')).toBeVisible();
      
      // Switch back to Health
      await page.click('text=Health');
      
      // Health field should be reset (new response type)
      const healthWorkersField = page.locator('input[name*="healthWorkersDeployed"]');
      await expect(healthWorkersField).toHaveValue('0');
    });

    await test.step('Verify entity and timeline preserved', async () => {
      // Entity should still be selected
      await expect(page.locator('text=Test Camp')).toBeVisible();
      
      // Timeline should be preserved
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      await expect(page.locator('input[type="date"]')).toHaveValue(dateString);
      await expect(page.locator('input[type="time"]')).toHaveValue('09:00');
    });
  });

  test('GPS integration and travel time estimation', async ({ page, context }) => {
    // Mock geolocation
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 9.0765, longitude: 7.3986 });

    await test.step('Select entity and verify GPS capture', async () => {
      await page.click('text=Select Affected Entity');
      await page.click('text=Test Camp >> nth=0');
      
      // Should trigger GPS capture and travel time calculation
      // Look for travel time field to be populated
      const travelTimeField = page.locator('input[id="travelTime"]');
      await expect(travelTimeField).not.toHaveValue('0');
    });

    await test.step('Verify timeline visualization updates', async () => {
      // Timeline should show estimated arrival and completion times
      await expect(page.locator('text=Estimated Arrival')).toBeVisible();
      await expect(page.locator('text=Estimated Completion')).toBeVisible();
      await expect(page.locator('text=Total Time Required')).toBeVisible();
    });
  });

  test('item templates and quantity planning', async ({ page }) => {
    await test.step('Use item templates', async () => {
      // Select response type to get relevant templates
      await page.click('text=Health');
      
      // Show templates
      await page.click('text=Show Templates');
      await expect(page.locator('text=Item Templates (HEALTH)')).toBeVisible();
      
      // Filter by category
      await page.click('text=Medicine'); // Category filter
      
      // Add template item
      await page.click('text=Add >> nth=0');
      
      // Item should appear in the planning grid
      await expect(page.locator('.grid.grid-cols-12')).toContainText('Paracetamol');
    });

    await test.step('Bulk import templates', async () => {
      await page.click('text=Import All');
      
      // Multiple items should be added
      const itemRows = page.locator('.grid.grid-cols-12');
      await expect(itemRows).toHaveCount(4); // At least 4 items should be added
    });

    await test.step('Customize quantities and units', async () => {
      // Modify first item
      const firstItemRow = page.locator('.grid.grid-cols-12').first();
      await firstItemRow.locator('input[type="number"]').fill('500');
      await firstItemRow.locator('input[placeholder*="Unit"]').fill('pills');
      
      // Add custom item
      await page.click('text=Add Item');
      const lastItemRow = page.locator('.grid.grid-cols-12').last();
      await lastItemRow.locator('input[placeholder*="Enter item name"]').fill('Emergency Kit');
      await lastItemRow.locator('input[type="number"]').fill('10');
      await lastItemRow.locator('input[placeholder*="Unit"]').fill('kits');
    });

    await test.step('Verify item summary', async () => {
      // Should show total item count
      await expect(page.locator('text=Total items:')).toBeVisible();
      
      // Clear all functionality
      await page.click('text=Clear All');
      await expect(page.locator('text=No items added yet')).toBeVisible();
    });
  });
});